"use strict";

const {state,State,sauce,vars,wallet} = require("./globals.js");
const {Log} = require("./logging.js");
const tools = require("./tools/calctools.js");
const time = require("./tools/time.js");
const money = require("./tools/money.js");
const Bitstamp = require("./data.js");

let rates = [];
let order_book = [];
let volume = [];


wallet.coin = vars.invest.coin;
wallet.fiat = vars.invest.fiat;

exports.order = function(data,flat){
	if(!Object.keys(data).length) return;
	if(!flat){
		data.bids = tools.flatten(data.bids);
		data.asks = tools.flatten(data.asks);
	}
		
	if(data.bids && data.asks){		
		if(!data.bids.amount||!data.asks.amount){
			//fix for legacy record method until 2108/09/26
			data.bids.vol = money.round.crypto(data.bids.vol*100);
			data.asks.vol = money.round.crypto(data.asks.vol*100);
		}
		state.order_bids = data.bids;
		state.order_asks = data.asks;
	}	
};
const setwallet = exports.setwallet = function(callback){
	if(state.dev){
		callback(false,true);
		return;
	}
	Bitstamp.private.balance((err,data)=>{
		if(err){
			callback(err,data);
			return;
		}
		Log.info(data);				
		wallet.coin = parseFloat(data.btc_available);
		wallet.fiat = parseFloat(data.usd_available);
		vars.expense = parseFloat(data.fee);
		callback(err,data);
	});	
};
exports.wallet = function(This,callback){
		
	const trade = This.trade;
	if(state.triggers.emergency){
		let diff = trade.price - money.bid(state.last_price);
		let e = state.trade_dir === "sell"?diff < 0:diff > 0;
		if(e) Log.info("["+time.datestamp(state.triggers.emergency).log+"] ________________"+"EMERGENCY -"+money.round.fiat(diff<0?diff*-1:diff));
	}
	state.dev?goDev(This,callback):go(trade,callback);	
};

exports.rate = function(trade){	
	
	rates.push(trade);
	if(rates.length > 1) state.init = true;
	tools.orderbook(order_book,trade);
	rates = time.timefilter(rates,"long_average");	
	tools.reset(rates,trade);
	
	const incline = [];
	for (var i = 0; i < rates.length; i++) {
		State.longcount++;
		let t = rates[i];
		tools.inertia(t,"long");
		tools.price(t,"long");
		if(t.timestamp > (trade.timestamp - sauce.short_average)){
			State.shortcount++;
			incline.push(t);
			tools.inertia(t,"short");
			tools.price(t,"short");			
		}
	}		
	tools.price(trade);
	tools.inertia();
	tools.speed();
	tools.trend();
	state.inclineshort = tools.incline(incline,"price");
	state.inclinelong = tools.incline(rates,"average");
		
};

exports.startprice = function(){
	if(state.first_trade && !state.triggers.emergency) return;
	state.price_target = money.bid(state.price_average);
};

function go(trade,callback){
	let amount = state.trade_dir==="sell"?wallet.coin:wallet.fiat;
	Bitstamp.private[state.trade_dir](amount,(err,Trade)=>{			
		if(err){
			callback(err,Trade);
			return;
		}
		Log.info(trade);
		Log.info(Trade);
		setTimeout(()=>{
			setwallet((err)=>{
				let item = tools.tradeItem(trade);
				item.price = Trade.price;				
				callback(err,item);
			});
		},5000);
	});
}
function goDev(This,callback){
	const trade = This.trade;
	tools.message(This.e);
	let fiat;
	if(state.trade_dir === "buy"){
		volume.push({timestamp:trade.timestamp,fiat:wallet.fiat});
		fiat = wallet.fiat;
		wallet.fiat = money.round.fiat(wallet.fiat - money.fee(wallet.fiat));
		wallet.coin = money.round.crypto(wallet.fiat/trade.price);
		wallet.fiat = 0;
	}else{
		fiat = trade.price * wallet.coin;			
		volume.push({timestamp:trade.timestamp,fiat:fiat});
		wallet.fiat = money.round.fiat(fiat - money.fee(fiat));
		wallet.coin = 0;
	}
	volume = time.timefilter(volume,"30d");
	let v = money.round.fiat(volume.reduce((a,b)=>{
		return a+b.fiat;
	},0));
	Log.info(
		"["+time.datestamp(trade.timestamp).log+"] %s %s %s %s %s",
		state.trade_dir==="sell"?"SELL: ":"BUY : ",
		money.string.fiat(trade.price)+" ---"+"$"+
		money.string.fiat(wallet.fiat?wallet.fiat:wallet.coin*trade.price),
		" | BTC:"+money.string.crypto(wallet.coin?wallet.coin:wallet.fiat/trade.price),
		"[peaked:"+state.triggered.peaked+" good:"+state.triggered.good+"["+state.triggered.total+
		"] glut:"+state.triggered.glut+" doldrum:"+state.triggered.doldrum+" total: "+state.triggered.total+"]",
		state.message||""
	);
	money.expense(v);
	let item = tools.tradeItem(trade);		
	callback(false,item);
}