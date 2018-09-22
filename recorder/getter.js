"use strict"

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const predict = require(path.join(__rootdir,'lib/predict.js'));
const Calc = require(path.join(__rootdir,'lib/calc.js'));
const tools = require(path.join(__rootdir,'lib/tools/calctools.js'));
const range = [20180704,tools.timestamp(Date.now()/1000,true)];
let Buffer;

module.exports.get = function(buffer){
	Buffer = buffer;
	const dir = path.join(__dirname,'data');
	const files = fs.readdirSync(dir).filter((file)=>{
		if(!file.startsWith('record')) return false;
		const date = parseFloat(file.replace('record',''))
		if(date < range[0]||date > range[1]) return false;
		return true
	})
	read(dir,files)
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
			for (var i = 0, len = Buffer.length; i < len; i++) {
				let item = Buffer[i];
				item._T === 'trades'?predict.addTrade(item):Calc.order(item);
			}
			Buffer = null;
			console.log('_______________FINISHED RESTORATION_________________________________')
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
		return item?true:false;
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

