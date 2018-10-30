"use strict";

global.__rootdir = __dirname;

const path = require("path");
const {state,wallet,setWeb,setGetter} = require("./lib/globals.js");
const {Log} = require("./lib/logging.js");
const recorder = require("./recorder/record.js");
const Bitstamp = require("./lib/data.js");
const Calc = require("./lib/calc.js");

state.loglevel = 0;

let predict,getter;
const loadingBuffer = [];

function processBatch(batch){
	while (batch.length){
		const item = batch.shift();
		Calc.order({
			timestamp:item.t.timestamp,
			bids:item.b,
			asks:item.a
		},true);
		predict.addTrade(item.t);
	}
	getter.send({batch:true});	
}

Bitstamp.channels.trades.bind("trade", function (data) {
	if(state.loading && !state.record){
		data._T = "trades";
		loadingBuffer.push(data);
	}else{
		if(!state.dev) recorder.input(data);
		if(!state.record) predict.addTrade(data);
	}
});

Bitstamp.channels.orders.bind("data", function (data) {
	if(state.loading && !state.record){
		data._T = "orders";
		loadingBuffer.push(data);
	}else{
		Calc.order(data);
	}
});
if(!state.record){
	state.loading = true;
	Calc.setWallet((err)=>{
		if(!state.dev && err){
			Log.info("Ending the process");
			process.exit();
			return;
		}
		const {fork} = require("child_process");
		const web = fork(path.join(__rootdir,"lib/graphserver"),process.argv.slice(2),{
			cwd:__rootdir
		});
		setWeb(web);
		getter = fork(path.join(__rootdir,"recorder/getter"),process.argv.slice(2),{
			cwd:__rootdir
		});
		setGetter(getter);
		predict = require("./lib/predict.js");
	
		getter.on("message",function(m){
			if(m.batch) processBatch(m.batch);
			if(m.done){
				while (loadingBuffer.length) {
					let item = loadingBuffer.shift();
					item._T === "trades"?
						predict.addTrade(item):
						Calc.order(item);
				}
				state.loading = false;
				web.send({loading:false});
				getter.send({exit:true});
				Log.info("_______________FINISHED RESTORATION_________________________________");
			}
		});

		if(!state.dev){
			state.trade_dir = wallet.coin && wallet.fiat < 100?"sell":"buy";
			state.opp_trade_dir = state.trade_dir === "sell"?"buy":"sell";
		}else{
			wallet.coin = 1;
			wallet.fiat = 0;
		}
		Log.info(wallet);
		Log.info("Trading direction: "+state.trade_dir);
		//getter.send({start:"20181028"});
		getter.send({start:""});
	});
}





