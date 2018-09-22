"use strict";

const path = require('path');
const tools = require(path.join(__dirname,'tools/calctools.js'));
const File = require('./files.js');
const sauce = require(path.join(__rootdir,"settings.json")).sauce;
const smoothing = sauce.smoothing; //the timespan in seconds that incoming trades will be smoothed before processing

let rates = [];
let startup_price = [];
let order_book = [];
let volume = [];
let times = [];
let trades = {0:[],1:[]};

wallet.coin = vars.invest.coin;
wallet.fiat = vars.invest.fiat;

exports.trade = function(trade){

	trade.timestamp = parseFloat(trade.timestamp);
	if(!state.start_time) state.start_time = trade.timestamp;
	if(state.start_time < trade.timestamp - tools.time(vars.smooth)) state.ready = true;

	trades[trade.type].push(trade);
	times.push(trade.timestamp);
	if(trade.timestamp - times[0] > smoothing){
		const Trade = {
			timestamp:0,
			price:0
		}
		let newtrades = [{},{}];
		Object.keys(trades).forEach((k)=>{
			trades[k].forEach((t)=>{
				Object.keys(t).forEach((k2)=>{
					if(k2 === 'type'){
						newtrades[k][k2] = k*1;
						return;
					}
					if(!newtrades[k][k2]) newtrades[k][k2] = 0;
					newtrades[k][k2] += t[k2]
				})
			})
		})

		newtrades.forEach((t,i)=>{
			if(!t.timestamp) return;
			t.timestamp = Math.round(t.timestamp/trades[i].length);			
			t.price = t.price/trades[i].length;
			t.vol = t.price*t.amount;
		})
		newtrades = newtrades.filter((t)=>{
			return Object.keys(t).length > 0;
		}).sort((a,b)=>{
			return a.timestamp - b.timestamp;
		})
		newtrades.forEach((trade)=>{
			startprice(trade);
			rate(trade);
			Trade.timestamp += trade.timestamp;
			Trade.price += trade.price;
		})

		Trade.timestamp = Math.round(Trade.timestamp/newtrades.length);
		Trade.price = Math.round((Trade.price/newtrades.length)*100)/100;

		state.price_average = Math.round(state.price_average*100)/100;
		state.price_short_average = Math.round(state.price_short_average*100)/100;
		state.trade_inertia = Math.round(state.trade_inertia);
		state.rate_frenzy = Math.round(state.rate_frenzy*10)/10;
		state.bull_bear = Math.round(state.bull_bear);
		state.orders = Math.round(state.orders*100)/100


		const items = tools.getItems(newtrades);
		if(!state.ready) items.trade.noready = true;
		File.goWrite('trade',items.trade);			
		//if(!state.loading) web.emit('trade',items.trade);

		trades = {0:[],1:[]};
		times = [];
		
		return Trade;
	}
	return false;
}

exports.order = function(data,flat){
	if(!Object.keys(data).length) return;
	if(!flat){
		data.bids = tools.flatten(data.bids,'bids');
		data.asks = tools.flatten(data.asks,'asks');
	}
		
	if(data.bids && data.asks){
		order_book.push(data);
		state.order_bids = data.bids;
		state.order_asks = data.asks;
	}	
}


exports.wallet = function(trade,callback){
	state.first_trade = true;
	state.emergency = false;
	if(state.trade_dir === 'buy'){
		volume.push({timestamp:trade.timestamp,fiat:wallet.fiat});
		wallet.fiat = Math.round((wallet.fiat - tools.fee(wallet.fiat))*100)/100;
		wallet.coin = wallet.fiat/trade.price;
		wallet.fiat = 0;
	}else{
		wallet.fiat = trade.price * wallet.coin;
		volume.push({timestamp:trade.timestamp,fiat:wallet.fiat});
		wallet.fiat = Math.round((wallet.fiat - tools.fee(wallet.fiat))*100)/100;
		wallet.coin = 0;
	}
	volume = tools.timefilter(volume,trade,24*60*30);
	let v = Math.round(volume.reduce((a,b)=>{
		return a+b.fiat;
	},0)*100)/100;
	
	console.log(tools.timestamp(trade.timestamp),state.trade_dir.toUpperCase()+' : '+trade.price+' ------------------'+'$'+wallet.fiat,'BTC:'+wallet.coin,'\n');
	console.log(
		'target: '+state.price_target+'\n',
		'orders: '+state.orders+'\n',
		'inertia: '+state.trade_inertia+'\n',
		'sentiment: '+state.bull_bear+'\n',
		'frenzy: '+state.rate_frenzy+'\n',
		'profit_diff: '+(trade.price - state.price_target)+'\n',
		'fee: '+vars.expense+'\n',
		'volume: '+v+'\n',
	);
	tools.expense(v);
	let item = {
		timestamp:trade.timestamp,
		price:trade.price,
		volume:trade.amount,
		target:state.price_target,
		frenzy:state.rate_frenzy,
		momentum:state.price_momentum,
		inertia:state.trade_inertia,
		dir:state.trade_dir,
		bull_bear:state.bull_bear,
		orders:state.orders
	}
	setTimeout(()=>{
		callback(false,item);
	})
	
}

function rate(trade){
	rates.push(trade);
	rates = tools.timefilter(rates,trade,vars.smooth);
	order_book = tools.timefilter(order_book,trade,vars.smooth_short);
	tools.orders(order_book);
	tools.reset(rates);
	let incline = [];
	for (var i = 0; i < rates.length; i++) {
		let t = rates[i];
		tools.speed(t,null);
		
		if(t.timestamp > (trade.timestamp - tools.time(vars.smooth_short))){
			incline.push(t.price);
			tools.speed(t,true);
			tools.price(t,true,null);			
		}
		tools.sentiment(rates,t,trade,i,null);
		tools.price(t,null,null);
		tools.inertia(t,null);
	}
	tools.incline(incline);
	tools.speed(null,null);
	tools.price(trade,null,rates.length)
	tools.inertia(null,rates.length);
	tools.sentiment(rates,null,null,null,rates.length);	
}

function startprice(trade){
	if(!state.emergency){
		startup_price = [];
		return;
	}
	startup_price.push(trade.price);
	state.last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
	state.price_target = tools.bid(state.last_price);
}