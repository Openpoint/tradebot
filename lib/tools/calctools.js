"use strict";

const {state,State} = require("../globals.js");
const {Log} = require("../logging.js");
const time = require("./time.js");
const money = require("./money.js");
const peaks = require("./predictpeaks.js");
const File = require("../files.js");


exports.inertia = function(t,stage){

	let type;
	if(t) type = t.type?"sell":"buy";

	if(stage==="long"){

		State[type+"longcount"]++;
		State["price_"+type+"_long"]+=t.price;
		State["amount_"+type+"_long"]+=t.amount;
		State["vol_"+type+"_long"]+=t.vol;
	}else if(stage==="short"){
		State[type+"shortcount"]++;
		State["price_"+type+"_short"]+=t.price;
		State["amount_"+type+"_short"]+=t.amount;
		State["vol_"+type+"_short"]+=t.vol;
	}else{
		const priceshort = ((State.vol_buy_short/State.amount_buy_short) - (State.vol_sell_short/State.amount_sell_short));
		const pricelong = ((State.vol_buy_long/State.amount_buy_long) - (State.vol_sell_long/State.amount_sell_long));
		state.inertia = priceshort-pricelong;
	}
};

exports.price = function(t,stage){
	if(stage==="long"){
		State.longprice+=t.price;
	}else if(stage==="short"){
		State.shortprice+=t.price;
	}else{
		t.average = state.price_average = money.round.fiat(State.longprice/State.longcount);
		t.short_average = state.price_short_average = money.round.fiat(State.shortprice/State.shortcount);
		if(state.trade_dir === "sell"){
			state.last_profit_time = state.price_short_average > state.price_target?t.timestamp:state.last_profit_time;
		}else{
			state.last_profit_time = state.price_short_average < state.price_target?t.timestamp:state.last_profit_time;
		}
	}
};
exports.trend = function(){
	state.trend = money.round.fiat(
		(state.speed+state.incline+state.peaks.inertia+state.orders)/4
	);
};

/*
Whether the market is bullish or bearish.
Expressed as the difference between the (short time price average) and the (long time price average).
*/
exports.speed = function(){
	state.speed = state.price_short_average - state.price_average;
};

/*
Average difference between crypto volume on order book over short time.
Expressed as (buy bid volume) - (sell bid volume).
*/
function orders(order_book){
	let buy = 0;
	let sell = 0;
	for(let i=0;i<order_book.length;i++){
		let order = order_book[i];
		buy += order.bids.vol;
		sell += order.asks.vol;
	}
	state.orders = money.round.crypto((buy-sell)/order_book.length);
}
function orderdupe(order_book){
	if(!order_book.length) return false;
	let last = order_book[order_book.length-1];
	last = last.bids.vol+"|"+last.asks.vol;
	let now = state.order_bids.vol+"|"+state.order_asks.vol;
	return (last === now);
}
exports.orderbook = function(order_book,trade){
	if(!state.order_bids || !state.order_asks) return;
	if(orderdupe(order_book)) return;
	order_book.push({
		timestamp:trade.timestamp,
		bids:state.order_bids,
		asks:state.order_asks
	});
	order_book = time.timefilter(order_book,"short_average");
	orders(order_book);
	state.order_bids = false;
	state.order_asks = false;
};

/*
The difference between min/max fiat price over the short/long time expressed as positive if rising, negative if not.
*/
exports.incline = function(data,key){
	let lowest;
	let highest;
	let range;
	for(let i=0;i<data.length;i++){
		let p =data[i][key];
		if(!lowest) lowest = [p,i];
		if(!highest) highest = [p,i];
		if(p < lowest[0]) lowest = [p,i];
		if(p > highest[0]) highest = [p,i];
	}
	highest[1] < lowest[1]?
		range = [lowest[0],highest[0]]
		:
		range = [highest[0],lowest[0]];
	return money.round.fiat(range[0] - range[1]);
};

/*
Tradebot records each 1second tick of order book data from Bitstamp API.
This function flattens each intake of top 100 orders into one representative, averaged order object.
*/
exports.flatten = function(data){
	let len = data.length;
	let foo = {vol:0,price:0,amount:0};
	for(let i=0;i<data.length;i++){
		let b = data[i];
		let v = b[1]*1;
		let p = b[0]*1;
		let a = v*p;
		foo.vol += v;
		foo.price += p;
		foo.amount += a;
	}
	foo.old = foo.vol/len;	//legacy logic before 2108/09/26
	foo.price = foo.price/len;
	foo.vol = money.round.crypto(foo.amount/foo.price);
	foo.price = money.round.fiat(foo.price);
	foo.amount = money.round.fiat(foo.amount);
	return foo;
};

module.exports.finishTrade = function(trade,item){
	state.first_trade = true;
	state.last_price = item[1];
	state.triggers.emergency = false;
	state.peaks = peaks.initPeaks(true);
	state.last_profit_time = trade.timestamp;
	File.goWrite("buysell",item);
	state.price_target = money.bid(item[1]);
	state.prev_price_target = state.price_target;
	state.opp_trade_dir = state.trade_dir;
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
};

exports.dataLoss = function(rates){

	if(rates[rates.length-2]&&rates[rates.length-1].timestamp - rates[rates.length-2].timestamp > time.toSeconds("30m")){
		if(state.start_time) Log.error("["+time.datestamp(rates[rates.length-2].timestamp).log+"] ________________LOSS in DATA, restarting calcs");
		state.start_time = false;
		//state.ready = false;
		state.triggers.emergency = false;
		//state.first_trade = false;
		state.dataloss = true;
	}
};

exports.reset = function(){
	let keys = Object.keys(State);
	for (let i=0;i<keys.length;i++){
		let k = keys[i];
		State[k] = 0;
	}
};

module.exports.message = function(e){
	state.message = false;
	if(e.cliff||e.stuck){
		state.message =
			(e.cliff?"Cliff ":"")+
			(e.stuck?"Stuck":"");
	}
};

