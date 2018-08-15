"use strict";

const path = require('path');
const tools = require(path.join(__dirname,'tools/calctools.js'));


let rates = [];
let startup_price = [];
let order_book = [];



exports.getItems = tools.getItems;
exports.getBuffer = function(){
	return rates;
}
exports.setBuffer = function(r){
	rates = r;
}

exports.rate = function(trade){
	let count = 0;
	rates.push(trade);
	rates = tools.timefilter(rates,trade,vars.smooth);
	tools.reset(rates);
	for (var i = 0; i < rates.length; i++) {
		let t = rates[i];
		tools.speed(t,null);
		if(t.timestamp > (trade.timestamp - tools.time(vars.smooth_short))){
			count++;
			tools.speed(t,true);
			tools.price(t,true,null);
			
		}
		tools.sentiment(rates,t,trade,i,null);
		tools.price(t,null,null);
		tools.inertia(t,null);
	}

	tools.speed(null,null);
	tools.price(trade,null,rates.length)
	tools.inertia(null,rates.length);
	tools.sentiment(rates,null,null,null,rates.length);
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
	order_book = tools.timefilter(order_book,data,vars.smooth_short);
	state.order_inertia = order_book.reduce((a,b)=>{
		//let buy = b.bids.weight?b.bids.weight:b.bids.vol*b.bids.price;
		//let sell = b.asks.weight?b.asks.weight:b.asks.vol*b.asks.price;
		let buy = b.bids.weight?b.bids.weight/b.bids.price:b.bids.vol;
		let sell = b.asks.weight?b.asks.weight/b.asks.price:b.asks.vol;
		let order = buy - sell;
		return a+(order);

	},0)/(order_book.length);	
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
	console.log(state.trade_dir.toUpperCase()+' : '+trade.price+' ------------------'+'$'+wallet.fiat,'BTC:'+wallet.coin,'\n');
	console.log(
		'check '+state.trade_dir+' profit:\n',
		'target: '+state.price_target+'\n',
		'inertia: '+state.trade_inertia+'\n',
		'momentum: '+state.price_momentum+'\n',
		'frenzy: '+state.rate_frenzy+'\n',
		'profit_diff: '+(trade.price - state.price_target)+'\n',
		'frequency: '+state.rate_frequency
	);
	return {
		timestamp:trade.timestamp,
		price:trade.price,
		volume:trade.amount,
		target:state.price_target,
		frenzy:state.rate_frenzy,
		momentum:state.price_momentum,
		inertia:state.trade_inertia,
		dir:state.trade_dir,
		bull_bear:state.bull_bear
	}
}

exports.startprice = function(trade){
	if(state.first_trade){
		startup_price = null;
		return;
	}
	startup_price.push(trade.price);
	state.last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
	state.price_target = tools.bid(state.last_price);
}