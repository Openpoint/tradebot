"use strict";

const {state,sauce,vars,wallet} = require("./globals.js");
const {tradeItem} = require("./tools/encoding.js");
const {initPeaks} = require("./tools/predictpeaks");
const {Log} = require("./logging.js");
const File = require("./files");
const tools = require("./tools/calctools.js");
const time = require("./tools/time.js");
const {bid,round,fee,string,expense} = require("./tools/money.js");
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
		if(!data.bids.amount||!data.asks.amount){ //fix for legacy record method until 2108/09/26			
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
const setWallet = exports.setWallet = function(callback){
	if(state.dev){
		callback(false,true);
		return;
	}
	Bitstamp.private.balance((err,data)=>{
		if(err){
			callback(err,data);
			setTimeout(()=>{
				setWallet(function(){
					return false;
				});
			},30000);
			return;
		}
		wallet.coin = parseFloat(data.btc_available);
		wallet.fiat = parseFloat(data.usd_available);
		vars.expense = parseFloat(data.fee);
		callback(err,data);
	});
};

module.exports.goTrade = function(that){
	if(!state.dev){
		state.inTrade = true;
		setWallet((err)=>{
			if(err){				
				state.inTrade = false;
				return;
			}
			transact(that,(err,item)=>{
				if(err){
					state.inTrade = false;
					return;
				}
				finishTrade(that.trade,item);
				state.inTrade = false;
			});
		});
	}else{
		transact(that,(err,item)=>{
			finishTrade(that.trade,item);
		});
	}
};

function transact(that,callback){
	let diff = that.trade.price - state.prev_price_target;
	let e = state.trade_dir === "sell"?diff < 0:diff > 0;
	if(e && state.last_price){
		diff = state.price_average - state.price_target;
		if(e) Log.info(`[${time.datestamp(state.emergency||that.trade.timestamp).log}] ________________ EMERGENCY -${(diff<0?diff*-1:diff).toFiat()}`);
		state.emergency = false;
	}
	const trade = that.trade;
	state.dev?goDev(that,callback):go(trade,callback);
}

function go(trade,callback){
	let amount = state.trade_dir==="sell"?wallet.coin:wallet.fiat;
	Bitstamp.private[state.trade_dir](amount,(err,Trade)=>{
		if(err){
			callback(err);
			return;
		}

		setTimeout(()=>{
			setWallet(()=>{
				logTrade({
					timestamp:trade.timestamp,
					price:parseFloat(Trade.price).factor()
				});
				let item = tradeItem(trade,parseFloat(Trade.price).factor(),state,wallet);
				callback(err,item);
			});
		},5000);
	});
}
function goDev(that,callback){
	const trade = that.trade;
	tools.message(that.logMessage);
	let fiat;
	if(state.trade_dir === "buy"){
		volume.push({timestamp:trade.timestamp,fiat:wallet.fiat});
		fiat = wallet.fiat;
		wallet.fiat = round.fiat(wallet.fiat - fee(wallet.fiat));
		wallet.coin = round.crypto(wallet.fiat/trade.price.toFiat());
		wallet.fiat = 0;
	}else{
		fiat = trade.price.toFiat() * wallet.coin;
		volume.push({timestamp:trade.timestamp,fiat:fiat});
		wallet.fiat = round.fiat(fiat - fee(fiat));
		wallet.coin = 0;
	}
	volume = time.timefilter(volume,"30d");
	let v = round.fiat(volume.reduce((a,b)=>{
		return a+b.fiat;
	},0));
	logTrade(trade);
	expense(v);
	let item = tradeItem(trade,false,state,wallet);
	callback(false,item);
}

function logTrade(trade){
	Log.info(
		`[${time.datestamp(trade.timestamp).log}] %s %s %s %s %s`,
		state.trade_dir==="sell"?"SELL: ":"BUY : ",
		`${string.fiat(trade.price.toFiat())} --- $${string.fiat(wallet.fiat?wallet.fiat:wallet.coin*trade.price.toFiat())}`,
		` | BTC:${string.crypto(wallet.coin?wallet.coin:(wallet.fiat/trade.price.toFiat()))}`,
		`[peaked:${state.triggered.peaks.toFiat()} good:${state.triggered.good.toFiat()} glut:${state.triggered.glut.toFiat()} trend:${state.trend.toFiat()} total:${state.triggered.total.toFiat()}]`,
		state.message||""
	);
}

function finishTrade(trade,item){
	state.first_trade = true;
	state.triggers.emergency = false;
	state.peaks = initPeaks(true);
	state.last_profit_time = trade.timestamp;
	File.goWrite("buysell",item);
	state.last_price = item[1].factor();
	state.price_target = bid(item[1].factor());
	state.prev_price_target = state.price_target;
	state.opp_trade_dir = state.trade_dir;
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
}

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