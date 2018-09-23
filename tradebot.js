"use strict";

const fs = require('fs');
const G = require('./lib/globals.js');
global.__rootdir = __dirname;
Object.keys(G.globals).forEach((k)=>{global[k] = G.globals[k]});
if(process.argv[2] === 'development') state.dev = true;
if(process.argv[2] === 'recorder') state.record = true;
require('./lib/logging.js');
const File = require('./lib/files.js');
if(!File.ready) return;
const recorder = require('./recorder/record.js');
const Bitstamp = require('./lib/bitstamp_data.js');
const Calc = require('./lib/calc.js');
let predict;
if(!state.record){
	global.web = new require('./lib/graphserver.js').web();
	predict = require('./lib/predict.js');
}

let Buffer = [];

Bitstamp.channels.trades.bind('trade', function (data) {
	if(state.loading && state.dev){
		data._T = 'trades';
		Buffer.push(data);
	}else{
		recorder.input(data);
		if(!state.record) predict.addTrade(data);
	}
})

Bitstamp.channels.orders.bind('data', function (data) {
	if(state.loading && state.dev){
		data._T = 'orders';
		Buffer.push(data);
	}else{
		Calc.order(data);
	}
})
if(state.record) return;
state.loading = true;
Calc.setwallet('btcusd',(err)=>{
	if(err){
		Log.error(err);
		return;
	}
	if(!state.dev){
		state.trade_dir = wallet.coin?'sell':'buy';
	}else{
		wallet.coin = 1;
		wallet.fiat = 0;
	}
	Log.info("Trading direction: "+state.trade_dir);
	const getter = require('./recorder/getter.js');
	getter.get(Buffer,"20180920");
})




