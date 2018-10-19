"use strict";

const {state,sauce} = require("../globals.js");
const {Log} = require("../logging.js");
const time = require("./time.js");
const {round} = require("./money.js");
let State;

exports.inertia = function(t,stage){

	let type;
	if(t) type = t.type?"sell":"buy";

	if(stage==="long"){
		State[type+"longcount"]++;
		State["amount_"+type+"_long"]+=t.amount;
		State["vol_"+type+"_long"]+=t.price*t.amount;
	}else if(stage==="short"){
		State[type+"shortcount"]++;
		State["amount_"+type+"_short"]+=t.amount;
		State["vol_"+type+"_short"]+=t.price*t.amount;
	}else{
		
		const priceshort = ((State.vol_buy_short/State.amount_buy_short).round() - (State.vol_sell_short/State.amount_sell_short).round());
		const pricelong = ((State.vol_buy_long/State.amount_buy_long).round() - (State.vol_sell_long/State.amount_sell_long).round());
		
		state.inertia = priceshort-pricelong;		
	}
};

exports.price = function(t,stage){
	if(stage==="long"){
		State.longcount++;
		State.longprice+= t.price;
	}else if(stage==="short"){
		State.shortcount++;
		State.shortprice+= t.price;
	}else{
		state.price_average = (State.longprice/State.longcount).round();
		state.price_short_average = (State.shortprice/State.shortcount).round();
		state.speed = state.price_short_average - state.price_average;
		if(state.trade_dir === "sell"){
			state.last_profit_time = state.price_short_average > state.price_target?
				t[t.length-1].timestamp:
				state.last_profit_time;
		}else{
			state.last_profit_time = state.price_short_average < state.price_target?
				t[t.length-1].timestamp:
				state.last_profit_time;
		}
		for (let trade of t){
			trade.average = state.price_average;
		}
	}
};
exports.trend = function(){
	state.trend = ((state.speed+state.incline+state.peaks.inertia+state.orders)/4).round();
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
	state.orders = ((buy-sell)/order_book.length).round();
}
function orderdupe(order_book){
	if(!order_book.length) return false;
	let last = order_book[order_book.length-1];
	last = `${last.bids.vol}${last.asks.vol}${last.bids.price}${last.asks.price}`;
	let now = `${state.order_bids.vol}${state.order_asks.vol}${state.order_bids.price}${state.order_asks.price}`;
	return (last === now);
}
exports.orderbook = function(order_book,trades){	
	for (let trade of trades){
		if(state.order_bids && state.order_asks && !orderdupe(order_book)){
			order_book.push({
				timestamp:trade.timestamp,
				bids:{
					vol:state.order_bids.vol.factor(),
					price:state.order_bids.price.factor()
				},
				asks:{
					vol:state.order_asks.vol.factor(),
					price:state.order_asks.price.factor()
				}
			});
			order_book = time.timefilter(order_book,"short_average");
			orders(order_book);
			state.order_bids = false;
			state.order_asks = false;
		}
	}
};

/*
The difference between min/max fiat price over the short/long time expressed as positive if rising, negative if not.
*/
exports.incline = function(data,key){
	let lowest;
	let highest;
	let range;
	for(let i=0;i<data.length;i++){
		let trade = data[i];
		let val = trade[key];
		if(!lowest) lowest = [val,i];
		if(!highest) highest = [val,i];
		if(val < lowest[0]) lowest = [val,i];
		if(val > highest[0]) highest = [val,i];
	}
	highest[1] < lowest[1]?
		range = [lowest[0],highest[0]]
		:
		range = [highest[0],lowest[0]];
	return range[0] - range[1];
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
	foo.vol = round.crypto(foo.amount/foo.price);
	foo.price = round.fiat(foo.price);
	foo.amount = round.fiat(foo.amount);
	return foo;
};



exports.dataLoss = function(trade){
	if(state.start_time && (trade.timestamp - state.lasttradetime) > sauce.short_average){
		if(state.loglevel > 0) Log.error(`[${time.datestamp(state.lasttradetime).log}] ________________LOSS in DATA, restarting calcs`);
		for(let key of Object.keys(state.triggers)){
			state.triggers[key] = false;
		}
		state.triggers.dataloss = true;
		state.condition = "normal";
		state.start_time = false;
		state.triggers.emergency = false;		
	}
	state.lasttradetime = trade.timestamp;
};

exports.reset = function(){
	State = new tempState();
};

module.exports.message = function(message){
	state.message = false;
	if(message.cliff||message.stuck){
		state.message =
			(message.cliff?"Cliff ":"")+
			(message.stuck?"Stuck":"");
	}
};

function tempState(){
	return {
		shortcount:0,
		longcount:0,
		sellshortcount:0,
		buyshortcount:0,
		selllongcount:0,
		buylongcount:0,
		shortprice:0,
		longprice:0,
		vol_sell_short:0,
		vol_sell_long:0,
		vol_buy_short:0,
		vol_buy_long:0,
		amount_sell_short:0,
		amount_sell_long:0,
		amount_buy_short:0,
		amount_buy_long:0,
		price_sell_short:0,
		price_sell_long:0,
		price_buy_short:0,
		price_buy_long:0
	};
}