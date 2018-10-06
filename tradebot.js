"use strict";

global.__rootdir = __dirname;

const {state,wallet} = require("./lib/globals.js");
require("./lib/tools/time.js");
const {Log} = require("./lib/logging.js");
const recorder = require("./recorder/record.js");
const Bitstamp = require("./lib/data.js");
const Calc = require("./lib/calc.js");

let predict;
if(!state.record){
	global.web = new require("./lib/graphserver.js").web();
	predict = require("./lib/predict.js");
}

let Buffer = [];

Bitstamp.channels.trades.bind("trade", function (data) {
	if(state.loading && state.dev){
		data._T = "trades";
		Buffer.push(data);
	}else{
		recorder.input(data);
		if(!state.record) predict.addTrade(data);
	}
});

Bitstamp.channels.orders.bind("data", function (data) {
	if(state.loading && state.dev){
		data._T = "orders";
		Buffer.push(data);
	}else{
		Calc.order(data);
	}
});
if(!state.record){
	state.loading = true;
	Calc.setwallet((err)=>{
		if(err){
			Log.error(err);
			return;
		}
		if(!state.dev){
			state.trade_dir = wallet.coin && wallet.fiat < 0.1?"sell":"buy";
		}else{
			wallet.coin = 1;
			wallet.fiat = 0;
			Log.info(wallet);
		}
		Log.info("Trading direction: "+state.trade_dir);
		const getter = require("./recorder/getter.js");
		getter.get(Buffer,"20180815");
	});
}





