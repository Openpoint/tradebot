"use strict";

global.__rootdir = process.cwd();

const fs = require("fs");
const path = require("path");
const LZString = require("lz-string");
const {state,sauce} = require("../lib/globals.js");
const {Log} = require("../lib/logging.js");
const time = require(path.join(__rootdir,"lib/tools/time.js"));

state.loglevel = 0;
const batchsize = 3500;

const long_average = sauce.long_average;
const recording = path.join(__rootdir,"recorder/data/recording");
const dir = state.dev?
	path.join(__rootdir,"recorder/data/development"):
	path.join(__rootdir,"recorder/data/production");
let range = time.timestamp.seconds(Date.now());
let files;
const data = [];
let batch = [];

if(state.dev){
	range = [0,time.datestamp(range).file];
}else{
	range = [time.datestamp(range-long_average).file,time.datestamp(range).file];
}

process.on("message",(m)=>{
	if (typeof m.start !== "undefined") get(m.start);
	if (m.batch) commit();
	if (m.exit) process.exit();
});

if(!fs.existsSync(dir)) fs.mkdirSync(dir);
if(fs.existsSync(recording)){
	let rs = fs.readdirSync(recording).map((f)=>{
		if(!f.startsWith("record")) return false;
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
		if(!f) return;
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

function get(start){
	if(!fs.readdirSync(dir).length){
		process.send({done:true});
		return;
	}
	if(state.dev && start){
		range[0] = start;
	}
	files = fs.readdirSync(dir).filter((file)=>{
		if(!file.startsWith("record")) return false;
		const date = parseFloat(file.replace("record",""));
		if(!range[0]) range[0] = date;
		
		if(date < range[0]||date > range[1]) return false;
		return true;
	});
	if(files.length){
		read();
	}else{
		process.send({done:true});
	}
}

function read(){
	if(!files.length){
		process.send({done:true});
		return;
	}
	let file = files.shift();
	if(state.loglevel > 0) Log.info(file);
	let inData = fs.readFileSync(path.join(dir,file),{
		encoding:"ucs2"
	}).split("\n");
	convert(inData);
}

function convert(inData){
	
	for(let i=0;i<inData.length;i++){
		let item = inData[i];
		try{
			item = LZString.decompress(item);
			if(typeof(item)==="string"){
				try {
					item = JSON.parse(item);
				}
				catch(e){
					if(state.loglevel > 0) Log.error("Error in parsing a trade from file.");
					item = false;
				}
			}
		}
		catch(e){
			if(state.loglevel > 0) Log.error("Error in decompressing a trade from file.");
			item = false;
		}
		if(item && item.b && item.a){
			data.push(item);
		}
	}
	inData = null;
	commit();
}
function commit(){
	if(data.length){
		let item = data.shift();
		item.b.dir = "bids";
		item.a.dir = "asks";
		batch.push(item);
		if(batch.length < batchsize){
			commit();
		}else{
			process.send({batch:batch});
			batch = [];
		}		
	}else{
		if(batch.length){
			process.send({batch:batch});
			batch = [];
		}else{
			read();
		} 
		
	}
}

