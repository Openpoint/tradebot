"use strict";

const tools = require("./tools/calctools.js");
const time = require("./tools/time.js");
const smooth = require("./tools/smooth.js");
const Bitstamp = require("./bitstamp_data.js");

let rates = [];
let startup_price = [];
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
			data.bids.vol = smooth.round.crypto(data.bids.vol*100);
			data.asks.vol = smooth.round.crypto(data.asks.vol*100);
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
exports.wallet = function(trade,prev_target,callback){
	if(state.emergency||state.cliff){
		let diff = trade.price - prev_target;
		let e = state.trade_dir === "sell"?diff < 0:diff > 0;
		if(e) Log.info("["+time.datestamp(state.emergency||state.cliff).log+"] ________________"+(state.cliff?"CLIFF -":"EMERGENCY -")+smooth.round.fiat(diff<0?diff*-1:diff));
	}
	if(!state.dev){
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
					let item = Item(trade);
					item.price = Trade.price;
					state.first_trade = true;
					state.emergency = false;
					state.cliff = false;				
					callback(err,item);
				});
			},5000);
		});		
	}else{
		let fiat;
		let coin;
		if(state.trade_dir === "buy"){
			volume.push({timestamp:trade.timestamp,fiat:wallet.fiat});
			fiat = wallet.fiat;
			wallet.fiat = smooth.round.fiat(wallet.fiat - tools.fee(wallet.fiat));
			wallet.coin = smooth.round.crypto(wallet.fiat/trade.price);
			wallet.fiat = 0;
		}else{
			coin = wallet.coin;
			fiat = trade.price * wallet.coin;			
			volume.push({timestamp:trade.timestamp,fiat:fiat});
			wallet.fiat = smooth.round.fiat(fiat - tools.fee(fiat));
			wallet.coin = 0;
		}
		volume = time.timefilter(volume,"30d");
		let v = Math.round(volume.reduce((a,b)=>{
			return a+b.fiat;
		},0)*100)/100;
		
		Log.info(
			"["+time.datestamp(trade.timestamp).log+"] %s %s %s %s",
			state.trade_dir==="sell"?"SELL: ":"BUY : ",
			smooth.string.fiat(trade.price)+" ------------------"+"$"+
			smooth.string.fiat(wallet.fiat?wallet.fiat:fiat),
			" | BTC:"+smooth.string.crypto(wallet.coin?wallet.coin:coin),
			state.message||""
		);
		/*
		Log.info([
			"target: "+state.price_target,
			"orders: "+state.orders,
			"inertia: "+state.trade_inertia,
			"sentiment: "+state.sentiment,
			"speed: "+state.speed,
			"profit_diff: "+(trade.price - state.price_target),
			"fee: "+vars.expense,
			"volume: "+v,
		]);
		*/
		tools.expense(v);
		let item = Item(trade);
		state.first_trade = true;
		state.emergency = false;
		state.cliff = false;
		callback(false,item);
	}	
};
function Item(trade){
	return {
		timestamp:trade.timestamp,
		price:trade.price,
		volume:trade.amount,
		target:state.price_target,
		speed:state.speed,
		momentum:state.price_momentum,
		inertia:state.trade_inertia,
		dir:state.trade_dir,
		sentiment:state.sentiment,
		orders:state.orders,
		incline:state.price_incline
	};
}
exports.rate = function(trade){	
	rates.push(trade);
	if(rates.length > 1) state.init = true;
	tools.orderbook(order_book,trade);
	rates = time.timefilter(rates,"long_average");	
	tools.reset(rates,trade);
	let incline = [];
	for (var i = 0; i < rates.length; i++) {
		let t = rates[i];
		tools.speed(t,null);
		
		if(t.timestamp > (trade.timestamp - sauce.short_average)){
			incline.push(t.price);
			tools.speed(t,true);
			tools.price(t,true,null);			
		}
		tools.price(t,null,null);
		tools.inertia(t,null);
	}
	tools.incline(incline);
	tools.speed(null,null);
	tools.price(trade,null,rates.length);
	tools.inertia(null,rates.length);
	tools.sentiment(rates);	
};

exports.startprice = function(trade){
	if(state.first_trade){
		startup_price = [];
		return;
	}
	startup_price.push({timestamp:trade.timestamp,price:trade.price});
	startup_price = time.timefilter(startup_price,"long_average");
	state.last_price = startup_price.reduce((a, b) => a + b.price,0)/startup_price.length;
	state.price_target = tools.bid(state.last_price);
};