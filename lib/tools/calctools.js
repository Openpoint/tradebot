"use strict";

const time = require("./time.js");
const smooth = require("./smooth.js");

let shortcount;
let shortprice;
let frequency={
	buy:0,
	sell:0
};
exports.expense = function(vol){
	if(vol < 20000){
		vars.expense = 0.25;
		return;
	}
	if(vol < 100000){
		vars.expense = 0.24;
		return;
	}
	if(vol < 200000){
		vars.expense = 0.22;
		return;
	}
	if(vol < 400000){
		vars.expense = 0.20;
		return;
	}
	if(vol < 600000){
		vars.expense = 0.15;
		return;
	}
	if(vol < 1000000){
		vars.expense = 0.14;
		return;
	}
	if(vol < 2000000){
		vars.expense = 0.13;
		return;
	}
	if(vol < 4000000){
		vars.expense = 0.12;
		return;
	}
	if(vol < 20000000){
		vars.expense = 0.11;
		return;
	}
	if(vol >= 20000000){
		vars.expense = 0.10;
	}
};
const fee = exports.fee = function(val){
	return val*(vars.expense/100);
};

exports.bid = function(val){
	if (state.trade_dir === "buy"){
		val += fee(val);
		val += fee(val);
	}else{
		val -= fee(val);
		val -= fee(val);
	}
	return smooth.round.fiat(val);
};

let State = {};
exports.reset = function(rates,trade){
	if(rates.length<=1 && state.init){
		if(state.start_time) Log.info("["+time.datestamp(trade.timestamp).log+"] ________________LOSS in DATA");
		state.start_time = false;
		state.ready = false;
		state.emergency = false;
		state.first_trade = false;		
	}
	let dirs = ["buy","sell"];
	shortcount = 0;
	shortprice = 0;
	frequency={
		buy:0,
		sell:0
	};

	State.rate_long = 0;
	State.rate_short = 0;	
	State.price_momentum = 0;
	State.price_average = 0;
	State.trade_inertia = 0;
	dirs.forEach((dir)=>{
		State["rate_"+dir+"_short"] = 0;
		State["rate_"+dir+"_long"] = 0;
		State["rate_"+dir+"_speed"] = 0;
	});
	
	if(!state.emergency && state.first_trade){
		
		let emergency = state.trade_dir === "sell"?
			(rates[rates.length-1].timestamp - state.last_profit_time - sauce.emergency.cut) > 0 && 
			(state.price_short_average - state.price_target)*-1 > sauce.emergency.limit:
			
			(rates[rates.length-1].timestamp - state.last_profit_time - sauce.emergency.cut) > 0 && 
			state.price_short_average - state.price_target > sauce.emergency.limit;
		if(emergency) state.emergency = trade.timestamp;
	}
};

/*
For each trading direction, the difference between: 
	(Crypto amount traded over the short time) and (Crypto amount trade over the long time*(ratio between long and short time)).
Expressed as (buy amount) - (sell amount)
*/
exports.speed = function(t,short){
	
	let type;
	if(t) type = t.type?"sell":"buy";
	if(t && !short){		
		State.rate_long+=t.amount;
		State["rate_"+type+"_long"]+=t.amount;
	}else if(t && short){
		State.rate_short+=t.amount;
		State["rate_"+type+"_short"]+=t.amount;
		frequency[type]++;
	}else{
		let dirs = ["buy","sell"];
		dirs.forEach((dir)=>{
			State["rate_"+dir+"_speed"] = State["rate_"+dir+"_short"] - (State["rate_"+dir+"_long"]*sauce.scale);
		});
		//state.speed = State.rate_sell_speed - State.rate_buy_speed;
		//state.speed = State.rate_buy_speed - State.rate_sell_speed
		state.speed = State.rate_buy_short - State.rate_sell_short;
	}
};

exports.price = function(t,short,length){
	if(t && !short && !length){		
		State.price_average+=t.price;
	}else if(t && short){
		shortcount++;
		shortprice+=t.price;
	}else{
		state.price_average = State.price_average/length;
		state.price_short_average = shortprice/shortcount;
		t.average = state.price_average;
		t.short_average = state.price_short_average;
		state.trade_dir === "sell"?
			state.last_profit_time = state.price_short_average > state.price_target?
				t.timestamp:
				state.last_profit_time:

			state.last_profit_time = state.price_short_average < state.price_target?
				t.timestamp:
				state.last_profit_time;
	}
};
/*
The average difference in fiat trading volume over the long time. 
Expressed as: (buy volume) - (sell volume)
*/
exports.inertia = function(t,len){
	if(t){
		let type = t.type?"sell":"buy";
		let inert = t.vol;
		inert = type==="sell"?inert*-1:inert;
		State.trade_inertia += inert;
	}else{
		state.trade_inertia = smooth.round.fiat(State.trade_inertia/len);
	}
};
/*
Whether the market is bullish or bearish.
Expressed as the difference between the (short time price average) and the (short time price average) of the long time ago.
*/
exports.sentiment = function(rates){
	state.sentiment = state.price_short_average - (rates[0].short_average||state.price_short_average);
	//state.sentiment = state.price_short_average - state.price_average;
};

/*
Average difference between crypto volume on order book over short time.
Expressed as (buy volume) - (sell volume).  
*/
function orders(order_book){
	let buy = 0;
	let sell = 0;
	order_book.forEach((order)=>{		
		buy += order.bids.vol;
		sell += order.asks.vol;	
	});
	state.orders = smooth.round.crypto((buy-sell)/order_book.length);
}
function orderdupe(order_book){
	if(!order_book.length) return false;
	let last = order_book[order_book.length-1];
	last = last.bids.vol+"|"+last.asks.vol;
	let now = state.order_bids.vol+"|"+state.order_asks.vol;
	if(last === now) console.log("DUPE");
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
The difference in min / max fiat price over the short time.
*/
exports.incline = function(data){
	let lowest;
	let highest;
	let range;
	data.forEach((p,i)=>{
		if(!lowest) lowest = [p,i];
		if(!highest) highest = [p,i];
		if(p < lowest[0]) lowest = [p,i];
		if(p > highest[0]) highest = [p,i];
	});
	lowest[1] < highest[1]?range = [lowest[0],highest[0]]:range = [highest[0],lowest[0]];
	state.price_incline = smooth.round.fiat(range[1] - range[0]);
};

/*
Tradebot records each 1second tick of order book data from Bitstamp API. 
This function flattens each intake of top 100 orders into one representative, averaged order object.
*/
exports.flatten = function(data){
	let len = data.length;
	let foo = {vol:0,price:0,amount:0};
	data.forEach((b)=>{
		let v = b[1]*1;
		let p = b[0]*1;
		let a = v*p;
		foo.vol += v;
		foo.price += p;
		foo.amount += a;
	});
	foo.old = foo.vol/len;	//legacy logic before 2108/09/26
	foo.price = foo.price/len;
	foo.vol = smooth.round.crypto(foo.amount/foo.price);
	foo.price = smooth.round.fiat(foo.price);
	foo.amount = smooth.round.fiat(foo.amount);
	return foo;
};

exports.getItems = function(trade){
	return {
		trade:{
			timestamp:Math.round(trade.timestamp),
			price:trade.price,
			inertia:state.trade_inertia,
			speed:{
				buy:state.rate_buy_speed,
				sell:state.rate_sell_speed,
				speed:state.speed,
				incline:state.price_incline
			},
			average:state.price_average,
			orders:state.orders,
			sentiment:state.sentiment,
			target:state.price_target,
			peaks:state.peaks,
			peaked:(state.peaked?1:-1),
			
		}
	};
};