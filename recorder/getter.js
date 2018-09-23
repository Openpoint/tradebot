"use strict"

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const predict = require(path.join(__rootdir,'lib/predict.js'));
const Calc = require(path.join(__rootdir,'lib/calc.js'));
const tools = require(path.join(__rootdir,'lib/tools/calctools.js'));
const dir = state.dev?
    path.join(__rootdir,'recorder/data/'):
	path.join(__rootdir,'recorder/data/buffer');
	
let range = Math.round(Date.now()/1000);

if(state.dev){
	range = [0,tools.timestamp(range,true)];
}else{
	range = [tools.timestamp(range-vars.smooth*60,true),tools.timestamp(range,true)];
} 
let Buffer;

module.exports.get = function(buffer,start){
	if(!fs.existsSync(dir)){
		state.loading = false;
		return;
	}
	Buffer = buffer;
	if(state.dev){
		if(start) range[0] = start;
	}
	const files = fs.readdirSync(dir).filter((file)=>{
		if(!file.startsWith('record')) return false;
		const date = parseFloat(file.replace('record',''))
		if(!range[0]) range[0] = date;
		if(date < range[0]||date > range[1]) return false;
		return true
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
		encoding:'ucs2'
	}).split('\n');
	convert(inData).then(()=>{		
		if(files.length){
			read(dir,files); 
		}else{
			state.loading = false;
			state.writeFile = true;
			for (var i = 0, len = Buffer.length; i < len; i++) {
				let item = Buffer[i];
				item._T === 'trades'?predict.addTrade(item):Calc.order(item);
			}
			Buffer = null;
			Log.info('_______________FINISHED RESTORATION_________________________________')
			Log.info(state);
		}
	});
	inData = null;
}

function convert(inData){
	inData = inData.map((item)=>{
		try{
			item = LZString.decompress(item);
			if(typeof(item)==='string'){
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
	item.b.dir = 'bids';
	item.a.dir = 'asks';
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
			})			
		}else{
			commit(data,resolve);
		}
		
	}else{
		data = null;
		resolve(true);
	}
}

