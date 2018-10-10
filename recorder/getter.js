"use strict";

const fs = require("fs");
const path = require("path");
const LZString = require("lz-string");
const {state,sauce} = require("../lib/globals.js");
const {Log} = require("../lib/logging.js");
const predict = require(path.join(__rootdir,"lib/predict.js"));
const Calc = require(path.join(__rootdir,"lib/calc.js"));
const time = require(path.join(__rootdir,"lib/tools/time.js"))
const long_average = sauce.long_average;
const recording = path.join(__rootdir,"recorder/data/recording");
const dir = state.dev?
	path.join(__rootdir,"recorder/data/development"):
	path.join(__rootdir,"recorder/data/production");

let range = time.timestamp.seconds(Date.now());

if(state.dev){
	range = [0,time.datestamp(range).file];
}else{
	range = [time.datestamp(range-long_average).file,time.datestamp(range).file];
} 
let Buffer;
if(!fs.existsSync(dir)) fs.mkdirSync(dir);
if(fs.existsSync(recording)){
	let rs = fs.readdirSync(recording).map((f)=>{
		let f2 = path.join(recording,f);
		let f3 = path.join(dir,f);
		let stats = fs.statSync(f2);
		return {
			file:f2,
			file2:f3,
			ts:stats.mtimeMs
		};
	});
	rs.forEach((f)=>{
		if(!fs.existsSync(f.file2)){
			fs.copyFileSync(f.file,f.file2);
		}else{
			let t = fs.statSync(f.file2);
			t=t.mtimeMs;
			if(t < f.ts){
				fs.copyFileSync(f.file,f.file2);
			}			
		}
	});
}

module.exports.get = function(buffer,start){
	if(!fs.readdirSync(dir).length){
		state.loading = false;
		return;
	}
	Buffer = buffer;
	if(state.dev){
		if(start) range[0] = start;
	}
	const files = fs.readdirSync(dir).filter((file)=>{
		if(!file.startsWith("record")) return false;
		const date = parseFloat(file.replace("record",""))
		if(!range[0]) range[0] = date;
		if(date < range[0]||date > range[1]) return false;
		return true;
	})
	if(files.length){
		read(dir,files)
	}else{
		state.loading = false;
	}
}

function read(dir,files){
	
	let file = files.shift();
	let inData = fs.readFileSync(path.join(dir,file),{
		encoding:"ucs2"
	}).split("\n");
	convert(inData).then(()=>{		
		if(files.length){
			read(dir,files); 
		}else{
			state.loading = false;
			state.writeFile = true;
			for (var i = 0, len = Buffer.length; i < len; i++) {
				let item = Buffer[i];
				item._T === "trades"?predict.addTrade(item):Calc.order(item);
			}
			Buffer = null;
			Log.info("_______________FINISHED RESTORATION_________________________________")
			//Log.info(state);
		}
	});
	inData = null;
}

function convert(inData){
	inData = inData.map((item)=>{
		try{
			item = LZString.decompress(item);
			if(typeof(item)==="string"){
				try {
					item = JSON.parse(item);
					return item;
				}
				catch(e){};
			};
		}
		catch(e){}
		return false;
	}).filter((item)=>{
		return item && item.b && item.a?true:false;
	})
	return new Promise((resolve,reject)=>{
		commit(inData,resolve);
		inData = null;
	})	
}

let count = 0;
function commit(data,resolve){
	count++;
	let item = data.shift();
	item.b.dir = "bids";
	item.a.dir = "asks";
	Calc.order({
		timestamp:item.t.timestamp,
		bids:item.b,
		asks:item.a
	},true);
	predict.addTrade(item.t);
	if(data.length){
		if(count > 200){
			count = 0;
			setTimeout(()=>{
				commit(data,resolve);
			},5)			
		}else{
			commit(data,resolve);
		}
		
	}else{
		data = null;
		resolve(true);
	}
}

