"use strict"

const fs = require('fs');
const path = require('path');
global.__rootdir = path.join(__dirname,'../');
if(!global.state){
	const G = require(path.join(__rootdir,'lib/globals.js'));
	Object.keys(G.globals).forEach((k)=>{global[k] = G.globals[k]});
}

const LZString = require('lz-string');
const predict = require(path.join(__rootdir,'lib/predict.js'));
const calc = require(path.join(__rootdir,'lib/calc.js'));
const tools = require(path.join(__rootdir,'lib/tools/calctools.js'));
const range = [20180704,tools.timestamp(Date.now()/1000,true)];

const get = function(){
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
	//console.log(file);
	let inData = fs.readFileSync(path.join(dir,file),{
		encoding:'ucs2'
	}).split('\n');
	convert(inData).then(()=>{		
		if(files.length){
			read(dir,files); 
		}else{
			transfer(calc.getBuffer());
		}
	});
	inData = null;
}

function transfer(data){
	let item = data.shift();
	try{
		item = JSON.stringify(item);
	}
	catch(e){
		if(data.length){
			transfer(data);			
		}else{
			console.log('alldone\n'+JSON.stringify(state)+'\n'+JSON.stringify(wallet));
		}
		return;
	}
	
	if(data.length){
		console.log('rates\n'+item);
		transfer(data);			
	}else{
		console.log('alldone\n'+JSON.stringify(state)+'\n'+JSON.stringify(wallet));
	}	
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
	calc.order({
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

get();
