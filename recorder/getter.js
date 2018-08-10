"use strict"

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const Calc = require(path.join(__dirname,'../lib/calc.js'));

const Data = [];
let addOrder;
let addTrade;

exports.get = function(Order,Trade){
	addOrder = Order;
	addTrade = Trade;
	return new Promise((resolve,reject)=>{
		const dir = path.join(__dirname,'data');
		const files = fs.readdirSync(dir).filter((file)=>{
			if(!file.startsWith('record')) return false;
			return true
		})
		read(dir,files,resolve)
	})
}
function read(dir,files,resolve){
	let file = files.shift();
	let inData = fs.readFileSync(path.join(dir,file),{
		encoding:'ucs2'
	}).split('\n');
	new convert(inData).then(()=>{
		if(!files.length){
			resolve(true);
		}else{
			read(dir,files,resolve);
		}
	});
}
function convert(inData){
	this.inData = inData;
	this.Data = [];
	this.go = function(){
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
		if(this.Data.length >= 1000){
			commit(this.Data);
			this.Data = [];
			setTimeout(()=>{		
				this.again();
			})
		}else{
			this.again();
		}
	}
	this.again = function(){
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
		//console.log(item);
		//state.order_bids = item.b;
		//state.order_asks = item.a;
		Calc.order({
			timestamp:item.t.timestamp,
			bids:item.b,
			asks:item.a
		},true);
		addTrade(item.t);
	})
}
