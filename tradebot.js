"use strict";

global.__rootdir = __dirname;
const G = require('./lib/globals.js');
Object.keys(G.globals).forEach((k)=>{global[k] = G.globals[k]});
const File = require('./lib/files.js');
if(!File.ready) return;
const History = require('./recorder/getter.js');
const Bitstamp = require('./lib/bitstamp_data.js');
const Calc = require('./lib/calc.js');
const tools = require('./lib/tools/calctools.js');
const web = new require('./lib/graphserver.js').web();


let Buffer = [];
let start_time;

Bitstamp.channels.trades.bind('trade', function (data) {
	if(state.loading){
		data._T = 'trades';
		Buffer.push(data);
	}else{
		addTrade(data);
	}
})

Bitstamp.channels.orders.bind('data', function (data) {
	if(state.loading){
		data._T = 'orders';
		Buffer.push(data);
	}else{
		Calc.order(data);
	}
})
//let stop = false;
let trades = 0;
let frenzies = 0;
let markets = 0;
let peak = 0;
let count= 0;
let starttime = 0;
function doTrade(trade){
	count++;
	trades+=trade.price;
	frenzies+=state.rate.frenzy;
	markets+=state.price.average;
	//let price = trades/count;
	let price = state.price.average;
	let frenzy = frenzies/count;
	let market = markets/count;
	if(!peak) peak = state.price.target;
	if(!starttime) starttime = trade.timestamp;

	if(state.trade_dir === 'sell' && price > peak) peak = price;
	if(state.trade_dir === 'buy' && price < peak) peak = price;




	if(starttime > trade.timestamp - tools.time(vars.speed.short)) return;
	function reset(){
		triggered = false;
		trades = 0;
		peak = 0;
		count = 0;
		starttime = 0;
		frenzies=0;
		console.log('____________________RESET__________________')
	}
	
	let minmarket = 0;
	let minfrenzy = 0;
	if(state.trade_dir === 'sell'){
		if(trade.price < state.price.target){
			reset();
			return false;
		}
		
		if(peak-price > 0){			
			console.log(tools.timestamp(trade.timestamp)+" |","Price:"+Math.round(trade.price)+" |","Drop:"+Math.round(peak-price)+" |","Average:"+state.price.average.toPrecision(4)+" |","Resistance:"+Math.round(state.resistance)+" |","Orders:"+Math.round(state.order_inertia)+" |","Trend:"+state.price.trend);
		}
		
		if(peak-price <= 0) return false;
		if(state.price.trend > 0) return false;
		if(state.resistance > 0) return false;
		if(state.order_inertia > 0) return false;

		/*
		if(state.price.average > minmarket*-1) return false;
		//if(state.rate.frenzy < state.price.average*-1) return false;
		if(state.rate.frenzy < minfrenzy) return false;
		*/
		
	}else{
		if(trade.price > state.price.target){
			reset();
			return false;			
		}
		
		if(peak-price < 0){
			console.log(tools.timestamp(trade.timestamp)+" |","Price:"+Math.round(trade.price)+" |","Rise:"+Math.round(peak-price)+" |","Average:"+state.price.average.toPrecision(4)+" |","Resistance:"+Math.round(state.resistance)+" |","Orders:"+Math.round(state.order_inertia)+" |","Trend:"+state.price.trend);
		}
		
		if(peak-price >= 0) return false;
		if(state.price.trend < 0) return false;
		if(state.resistance > 0) return false;
		if(state.order_inertia < 0) return false;

		//if(state.price.average < minmarket) return false;
		//if(state.resistance < 0) return false;
		//if(state.rate.frenzy > minfrenzy*-1) return false;
		//if(state.rate.frenzy < frenzy) return false;
	}
	state.first_trade = true;	
	state.last_price = trade.price;
	state.price.target = tools.bid(state.last_price);
	const item = Calc.wallet(trade);
	//tools.resetWarp();
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";	
	if(!state.loading) web.emit('buysell',item);
	File.write('buysell',item);
	reset();
}

//let busy = false;
let triggered = false;

const buffer = [];
function addTrade(trade){
	//if(stop) return;
	if(!start_time) start_time = trade.timestamp;
	if(start_time < trade.timestamp - tools.time(vars.smooth)) state.ready = true;
	state.price.active = trade.price;
	Calc.startprice(trade);
	Calc.rate(trade);
	state.prev_inertia = state.trade_inertia;
	state.price.prev_momentum = state.price.momentum;
	state.price.prev_average = state.price.average;
	state.prev_trade = trade;

	
	const items = Calc.getItems(trade);
	if(!state.ready) items.trade.noready = true;
	if(!state.loading) web.emit('trade',items.trade);
	if(triggered){
		File.write('trade',items.trade);
		doTrade(trade);
		return;
	}
	if(state.ready){
		let proceed = Calc.checkProfit(trade)						
		File.write('trade',items.trade,proceed);
		if(proceed){
			console.log('_________________TRIGGER_____________________________')
			triggered = true;
			doTrade(trade);
		}
	}else{
		File.write('trade',items.trade);
	}
}

History.get(null,addTrade).then(()=>{
	Buffer = Buffer.filter((item)=>{
		item._T === 'trades'?addTrade(item):Calc.order(item);
		return false;
	})
	web.getData().then((data)=>{
		web.emit('all',data);
	})	
	state.loading = false;
	console.log('_____________Done restoring data__________________');
});



