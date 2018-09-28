"use strict";

const time = require("./time.js");
const Calc = require("../calc.js");
const tools = require("./calctools.js");
const File = require("../files.js");

/*
Flatten all incoming trades over defined setting (sauce.smoothing) into two trades (type buy and type sell), 
run calcs, then combine into one combined trade for market prediction
*/
let times = [];
let trades = {0:[],1:[]};
exports.trade = function(trade){
	trade.timestamp = time.timestamp.seconds(trade.timestamp);
	if(!state.start_time) state.start_time = trade.timestamp;
	if(state.start_time < trade.timestamp - sauce.long_average) state.ready = true;

	trades[trade.type].push(trade);
	times.push(trade.timestamp);
	if(trade.timestamp - times[0] > sauce.smoothing){
		
		const Trade = {
			timestamp:0,
			price:0
		};
		let newtrades = [{vol:0},{vol:0}]; //the two new trades, which will be the sum of each trade type
		
		for (let k=0;k < 2; k++){
			for (let i=0; i < trades[k].length; i++) {
				
				let t = trades[k][i];
				let keys = Object.keys(t);
								
				for (let j=0; j < keys.length; j++){
					let k2 = keys[j];
					if(k2 === "type"){
						newtrades[k][k2] = k*1;
					}else{
						if(!newtrades[k][k2]) newtrades[k][k2] = 0;
						newtrades[k][k2] += t[k2];
						newtrades[k].vol += t.price*t.amount;
					}
				}
								
			}
		}
		newtrades.forEach((t,i)=>{
			if(!t.timestamp) return;
			t.timestamp = time.timestamp.seconds(t.timestamp/trades[i].length);
			t.amount = round.crypto(t.vol/t.price);			
			t.price = round.fiat(t.price/trades[i].length);
		});
		
		newtrades = newtrades.filter((t)=>{
			return Object.keys(t).length > 1;
		}).sort((a,b)=>{
			return a.timestamp - b.timestamp;
		});
	
		//run calcs and combine trades to one;
		newtrades.forEach((trade)=>{
			Calc.startprice(trade);
			Calc.rate(trade);
			Trade.timestamp += trade.timestamp;
			Trade.price += trade.price;
		});

		Trade.timestamp = time.timestamp.seconds(Trade.timestamp/newtrades.length);
		Trade.price = round.fiat(Trade.price/newtrades.length);

		state.price_average = round.fiat(state.price_average);
		state.price_short_average = round.fiat(state.price_short_average);
		state.speed = round.crypto(state.speed);
		state.sentiment = round.fiat(state.sentiment);
		state.orders = round.crypto(state.orders);


		const items = tools.getItems(Trade);
		if(!state.ready) items.trade.noready = true;
		File.goWrite("trade",items.trade);

		trades = {0:[],1:[]};
		times = [];
		
		return Trade;
	}
	return false;
};

const round = exports.round = {
	fiat:function(f){
		return Math.round(f*100)/100;
	},
	crypto:function(c){
		return Math.round(c*100000000)/100000000;
	}
};

exports.string = {
	fiat:function(f){
		f = f.toString().split(".");
		if (f.length < 2) return f+".00"; 
		if(f[1].length > 2) f[1] = f[1].slice(0,2);
		if(f[1].length < 2) f[1] += "0";
		return f.join(".");
	},
	crypto:function(f){
		f = f.toString().split(".");
		if (f.length < 2) return f+".00000000";
		if(f[1].length > 8) f[1] = f[1].slice(0,8);
		if(f[1].length < 8){
			let i = 8 - f[1].length;
			while(i > 0){
				f[1] += "0";
				i--;
			}			
		}
		return f.join(".");		
	}
};