"use strict"

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const Calc = require(path.join(__dirname,'../lib/calc.js'));

const Data = [];
let addOrder;
let addTrade;
let count = 0;


exports.get = function(Order,Trade){
	addOrder = Order;
	addTrade = Trade;
	return new Promise((resolve,reject)=>{
		const dir = path.join(__dirname,'data');
		const files = fs.readdirSync(dir).filter((file)=>{
			if(!file.startsWith('record')) return false;
			count ++;
			return true
		})
		console.log(files);
		read(dir,files,resolve)
	})
}
function read(dir,files,resolve){
	let file = files.shift();
	let inData = fs.readFileSync(path.join(dir,file),{
		encoding:'ucs2'
	}).split('\n');
	new convert(inData).then(()=>{
		count --;
		if(!count){
			resolve(true);
		}else{
			read(dir,files,resolve);
		}
	});
}
function convert(inData){
	this.inData = inData;
	this.Data = [];
	if(!this.go) this.go = function(){
		let item = this.inData.shift();
		try{
			item = LZString.decompress(item);
			if(typeof(item)!=='string'){
				this.again();
				return;
			};
		}
		catch(e){
			this.again();
			return;
		}
		try {
			item = JSON.parse(item);
		}
		catch(e){
			this.again();
			return;
		}

		this.Data.push(item);
		if(this.Data.length >= 5000){
			commit(this.Data);
			this.Data = [];
			setTimeout(()=>{		
				this.again();
			})
		}else{
			this.again();
		}
	}
	if(!this.again) this.again = function(){
		if(!this.inData.length){
			commit(this.Data);
			this.resolve(true);
			return;
		}
		this.go();
	}
	return new Promise((resolve,reject)=>{
		this.resolve = resolve;
		this.go();
	})
	
	
}

function commit(data){	
	data.forEach((item)=>{
		state.order_bids = item.b;
		state.order_asks = item.a;
		Calc.order({},true);
		addTrade(item.t);
	})
}
