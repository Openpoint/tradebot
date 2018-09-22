"use strict";

const G = require('./lib/globals.js');
global.__rootdir = __dirname;
Object.keys(G.globals).forEach((k)=>{global[k] = G.globals[k]});
if(process.argv[2] === 'development') state.dev = true;
if(process.argv[2] === 'recorder') state.record = true;
const File = require('./lib/files.js');
if(!File.ready) return;
const recorder = require('./recorder/record.js');
const Bitstamp = require('./lib/bitstamp_data.js');
const Calc = require('./lib/calc.js');
global.web = new require('./lib/graphserver.js').web();
const predict = require('./lib/predict.js');


let Buffer = [];


Bitstamp.channels.trades.bind('trade', function (data) {
	if(state.loading && state.dev){
		data._T = 'trades';
		Buffer.push(data);
	}else{
		predict.addTrade(data);
	}
})

Bitstamp.channels.orders.bind('data', function (data) {
	if(state.loading && state.dev){
		data._T = 'orders';
		Buffer.push(data);
	}else if(state.record){
		recorder.input(data);
	}else{
		Calc.order(data);
	}
})
if(state.record) return;

Bitstamp.private.balance('btcusd',(err,data)=>{
	if(err){
		console.log(err);
		return;
	}
	console.log(data);
})

state.loading = true;
const getter = require('./recorder/getter.js');
getter.get(Buffer);

