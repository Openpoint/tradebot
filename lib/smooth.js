"use strict";

const {state,sauce} = require("./globals.js");
const time = require("./tools/time.js");
const Calc = require("./calc.js");
const {Log} = require("./logging");
const {getItems} = require("./tools/encoding.js");
const {Test} = require("./tools/test.js");
const File = require("./files.js");
const peaks = require("./tools/predictpeaks.js");
const ptools = require("./tools/predicttools.js");
const tools = require("./tools/calctools.js");
/*
Flatten all incoming trades over defined setting (sauce.smoothing) into two trades (type buy and type sell),
run calcs, then combine into one combined trade for market prediction
*/
let times = new makeTimes;
let trades = new makeTrades();
const test = new Test();

function makeTrades(){
	return {0:[],1:[]};
}
function makeTimes(){
	return [];
}
let interval;
exports.trade = function(trade,callback){
	trade.price = trade.price.factor();
	trade.amount = trade.amount.factor();	
	trade.timestamp = time.timestamp.seconds(trade.timestamp);
	trades[trade.type].push(trade);
	times.push(trade.timestamp);
	if(state.loading){
		if(trade.timestamp - times[0] > sauce.smoothing){
			const temp = [times.pop(),trades[trade.type].pop()];
			callback(flatten(temp));
		}
	}else{
		if(!interval){
			callback(flatten());
			interval = setInterval(()=>{
				if(times.length){
					callback(flatten());
				}else{
					clearInterval(interval);
					interval = false;
				}
			},sauce.smoothing*1000);			
		} 
	}
};

function flatten(temp){
	//the supertrade object which will be returned for prediction calcs
	const Trade = {
		timestamp:0,
		price:0
	};

	//the new trades, which will be the sum average of each trade type (ie. buy / sell) over the smoothing time
	let newtrades = {};
	for (let type = 0;type < 2; type++){
		for (let trade of trades[type]) {
			if(!newtrades[type]) newtrades[type] = {};
			for (let key of Object.keys(trade)){
				if(key === "type"){
					newtrades[type][key] = type*1;
				}else{
					if(!newtrades[type][key]) newtrades[type][key] = 0;
					newtrades[type][key] += trade[key];
				}
			}
		}
	}
	for (let type of Object.keys(newtrades)){
		let trade = newtrades[type];
		let len = trades[trade.type].length;
		trade.timestamp = time.timestamp.seconds(trade.timestamp/len);

		trade.price = (trade.price/len).round();
		trade.amount = (trade.amount/len).round();
	}
	if(!newtrades[0]||!newtrades[1]){
		newtrades = [newtrades[0]||newtrades[1]];
	}else{
		newtrades = newtrades[0].timestamp < newtrades[1].timestamp?
			[newtrades[0],newtrades[1]]:
			[newtrades[1],newtrades[0]];
	}

	//Do calculations
	Calc.rate(newtrades);
	Calc.startprice();


	//combine trades to one;
	for(let trade of newtrades){			
		Trade.timestamp += trade.timestamp;
		Trade.price += trade.price;
	}	
	Trade.timestamp = time.timestamp.seconds((Trade.timestamp/newtrades.length).round());
	Trade.price = (Trade.price/newtrades.length).round();

	//finish and write/return
	tools.dataLoss(Trade);
	if(!state.start_time) state.start_time = Trade.timestamp;
	if(state.start_time < Trade.timestamp - sauce.long_average){
		if(state.triggers.dataloss && state.loglevel > 0) Log.error(`[${time.datestamp(Trade.timestamp).log}] ________________RECOVERED from LOSS in DATA`);
		state.triggers.dataloss = false;
		state.ready = true;
		peaks.price = state.price_average;
	}
	const ready = ptools.ready();
	peaks.Peak(ready);
	const item = getItems(Trade,state);
	if(ready) checkEmergency(Trade);

	File.goWrite("Trade",item);
	trades = new makeTrades();
	times = new makeTimes();
	if(temp){
		trades[temp[1].type].push(temp[1]);
		times.push(temp[0]);
	}

	if(ready){
		return Trade;
	}else{
		return false;
	}
}

function checkEmergency(trade){
	
	let prev = state.triggers.emergency;
	if(!state.triggers.emergency && state.first_trade){
		let emergency = test.emergency(trade);
		if(emergency){
			if(!prev) prev = "new";
			state.triggers.emergency = true;
		}
	}
	if(prev!=="new" && state.first_trade && state.triggers.emergency){
		state.trade_dir === "sell"?
			trade.price > (state.prev_price_target - sauce.emergency.limit)?resetEmergency(trade):null:
			trade.price < (state.prev_price_target + sauce.emergency.limit)?resetEmergency(trade):null;
	}
}
function resetEmergency(trade){
	if(state.loglevel > 0) Log.info(`[${time.datestamp(trade.timestamp).log}] RESET EMERGENCY`);
	state.triggers.emergency = false;
	state.price_target = state.prev_price_target;
}
