"use strict";

const path = require('path');
const tools = require(path.join(__dirname,'tools/calctools.js'));


let rates = [];
let startup_price = [];
let order_book = [];
const dirs = ['buy','sell'];
const scale = vars.speed.short/vars.smooth;

exports.getItems = tools.getItems;

exports.rate = function(trade){
	const frequency={
		buy:0,
		sell:0
	}
	rates.push(trade);
	rates = tools.timefilter(rates,trade,tools.timeWarp());
	state.rate.long = 0;
	state.rate.short = 0;
	dirs.forEach((dir)=>{
		state.rate[dir].short = 0
		state.rate[dir].long = 0
		state.rate[dir].speed = 0
	})
	
	state.price.momentum = 0;
	state.price.average = 0;
	state.price.trend = 0;
	state.trade_inertia = 0;

	let avcount = 0;
	rates.forEach((t,i)=>{
		let type = t.type?'sell':'buy';
		state.rate.long+=t.amount;
		state.rate[type].long+=t.amount;
		if(t.timestamp > (trade.timestamp - tools.time(vars.speed.short))){
			state.rate.short+=t.amount;
			state.rate[type].short+=t.amount;
			frequency[type]++;
		}
		if(t.timestamp > (trade.timestamp - tools.time(60))){
			avcount++;
			state.price.average+=t.price;
		}
		let inert = t.price*t.amount
		inert = type==='sell'?inert*-1:inert;
		state.trade_inertia+= inert;
		
		let moment;
		if(!rates[i+1]) {
			moment = t.price - trade.price;
		}else{
			moment = rates[i+1].price - t.price;
		}
		 
		//state.price.momentum+=1/t.price * moment;
		state.price.momentum+=moment;
	})
	state.rate.speed = state.rate.short - state.rate.long*scale;
	dirs.forEach((dir)=>{
		state.rate[dir].speed = state.rate[dir].short - state.rate[dir].long*scale;
	})
	dirs.forEach((dir)=>{
		//state.rate[dir].frenzy = state.rate[dir==='buy'?'sell':'buy'].speed - state.rate[dir].speed;
		state.rate[dir].frequency = frequency[dir];
	})
	state.rate.frenzy = state.rate.buy.speed - state.rate.sell.speed;
	state.trade_inertia = state.trade_inertia/rates.length;
	state.price.average = state.price.average/avcount;
	state.price.trend = trade.price - state.price.average;
	//state.price.momentum = state.price.momentum*rates.length;
	state.resistance = state.trade_inertia*state.price.momentum/100;

	state.rate.frequency = state.rate.buy.frequency - state.rate.sell.frequency;
}

exports.order = function(data,flat){

	if(!Object.keys(data).length) return;
	if(!flat){
		data.bids = tools.flatten(data.bids,'bids');
		data.asks = tools.flatten(data.asks,'asks');
	}
	//if(!data.asks||!data.bids) return;
	//state.order_inertia = (data.bids.price*data.bids.vol)-(data.asks.price*data.asks.vol);

	
	state.order_bids = data.bids;
	state.order_asks = data.asks;
	
	if(data.bids && data.asks){
		//state.order_inertia = data.bids.weight?data.bids.weight-data.asks.weight:(data.bids.vol*data.bids.price)-(data.asks.vol*data.asks.price);
		order_book.push(data);
	}
	//return;
	order_book = tools.timefilter(order_book,data,vars.speed.short);
	state.order_inertia = order_book.reduce((a,b)=>{
		//let buy = b.bids.weight?b.bids.weight:b.bids.vol*b.bids.price;
		//let sell = b.asks.weight?b.asks.weight:b.asks.vol*b.asks.price;
		let buy = b.bids.weight?b.bids.weight/b.bids.price:b.bids.vol;
		let sell = b.asks.weight?b.asks.weight/b.asks.price:b.asks.vol;
		let order = buy - sell;
		return a+(order);

	},0)/(order_book.length);	
}

exports.checkProfit = function(trade){

	const dir = state.trade_dir;
	const Bid = state.price.target;
	if(dir === 'sell'){			
		if(trade.price < Bid) return false;
		return true
		/*
		if(state.rate.sell.frenzy > -f) return false;		
		if(state.price.momentum < 0 || state.trade_inertia < 0 ) return false;
		if(state.trade_inertia < state.price.momentum) return false;
		let test = state.trade_inertia+state.price.momentum+state.rate.sell.frenzy*-1
		if(test < 299) return false;
		console.log(test)
		*/
	}else{		
		if(trade.price > Bid) return false;
		return true;
		/*
		if(state.rate.buy.frenzy > -f) return false;
		if(state.trade_inertia > state.price.momentum) return false;
		let test = state.trade_inertia*-1+state.price.momentum*-1+state.rate.buy.frenzy*-1
		if(test < 299) return false;
		console.log(test)
		*/
	}
}

exports.wallet = function(trade){
	

	if(state.trade_dir === 'buy'){
		wallet.fiat = wallet.fiat - tools.fee(wallet.fiat);
		wallet.coin = wallet.fiat/trade.price;
		wallet.fiat = 0;
	}else{
		wallet.fiat = trade.price * wallet.coin;
		wallet.fiat = wallet.fiat - tools.fee(wallet.fiat);
		wallet.coin = 0;
	}
	console.log(state.trade_dir.toUpperCase()+' : '+trade.price+' ------------------'+'$'+wallet.fiat,'BTC:'+wallet.coin);
	console.log(
		'check '+state.trade_dir+' profit:\n',
		'target: '+state.price.target+'\n',
		'inertia: '+state.trade_inertia+'\n',
		'momentum: '+state.price.momentum+'\n',
		'frenzy: '+state.rate.frenzy+'\n',
		'profit_diff: '+(trade.price - state.price.target)+'\n',
		'frequency: '+state.rate.frequency
	);
	return {
		timestamp:trade.timestamp*1000,
		price:trade.price,
		volume:trade.amount,
		target:state.price.target,
		resistance:state.resistance,
		frenzy:state.rate.frenzy,
		momentum:state.price.momentum,
		inertia:state.trade_inertia,
		dir:state.trade_dir
	}
}

exports.startprice = function(trade){
	if(state.ready){
		startup_price = false;
		return;
	}
	startup_price.push(trade.price);
	state.last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
	state.price.target = tools.bid(state.last_price);
}