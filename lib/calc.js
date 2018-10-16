"use strict";

const {state,sauce,vars,wallet} = require("./globals.js");
const {tradeItem} = require("../web/js/encoding.js");
const {Log} = require("./logging.js");
const tools = require("./tools/calctools.js");
const time = require("./tools/time.js");
const {bid,round,fee,string,expense} = require("../web/js/money.js");
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
			data.bids.vol = round.crypto(data.bids.vol*100);
			data.asks.vol = round.crypto(data.asks.vol*100);
		}
		data.bids.vol = round.fiat(data.bids.vol);
		data.bids.price = round.fiat(data.bids.price);
		data.asks.vol = round.fiat(data.asks.vol);
		data.asks.price = round.fiat(data.asks.price);

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
	let diff = trade.price - bid(state.last_price);
	let e = state.trade_dir === "sell"?diff < 0:diff > 0;
	if(e){
		if(e) Log.info(`[${time.datestamp(state.triggers.emergency).log}] ________________ EMERGENCY -${(diff<0?diff*-1:diff).toFiat()}`);
	}
	state.dev?goDev(This,callback):go(trade,callback);
};

exports.rate = function(trades){
	rates = rates.concat(trades);
	tools.orderbook(order_book,trades);
	rates = time.timefilter(rates,"long_average");
	tools.reset();

	const incline = [];
	for (let trade of rates) {
		tools.inertia(trade,"long");
		tools.price(trade,"long");
		if(trade.timestamp > (trades[trades.length-1].timestamp - sauce.short_average)){
			incline.push(trade);
			tools.inertia(trade,"short");
			tools.price(trade,"short");
		}
	}
	tools.price(trades);
	tools.inertia();
	state.inclineshort = tools.incline(incline,"price");
	state.inclinelong = tools.incline(rates,"average");
	state.incline = state.inclineshort + state.inclinelong;
	tools.trend();
};

exports.startprice = function(){
	if(state.first_trade && !state.triggers.emergency) return;
	state.price_target = bid(state.price_average);
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
				let item = tradeItem(trade,Trade.price,state);
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
		wallet.fiat = round.fiat(wallet.fiat - fee(wallet.fiat));
		wallet.coin = round.crypto(wallet.fiat/trade.price);
		wallet.fiat = 0;
	}else{
		fiat = trade.price * wallet.coin;
		volume.push({timestamp:trade.timestamp,fiat:fiat});
		wallet.fiat = round.fiat(fiat - fee(fiat));
		wallet.coin = 0;
	}
	volume = time.timefilter(volume,"30d");
	let v = round.fiat(volume.reduce((a,b)=>{
		return a+b.fiat;
	},0));
	Log.info(
		`[${time.datestamp(trade.timestamp).log}] %s %s %s %s %s`,
		state.trade_dir==="sell"?"SELL: ":"BUY : ",
		`${string.fiat(trade.price.toFiat())} --- $${string.fiat(wallet.fiat?wallet.fiat.toFiat():(wallet.coin*trade.price).toFiat())}`,
		` | BTC:${string.crypto(wallet.coin?wallet.coin:(fiat/trade.price))}`,
		`[peaked:${state.triggered.peaks.toFiat()} good:${state.triggered.good.toFiat()} glut:${state.triggered.glut.toFiat()} trend:${state.trend.toFiat()} total:${state.triggered.total.toFiat()}]`,
		state.message||""
	);
	expense(v);
	let item = tradeItem(trade,false,state);
	callback(false,item);
}