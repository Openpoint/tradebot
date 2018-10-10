"use strict";

const {state,sauce} = require("./globals.js");
const time = require("./tools/time.js");
const Calc = require("./calc.js");
const {getItems} = require("../web/js/encoding.js");
const {Test} = require("./tools/test.js");
const File = require("./files.js");
const peaks = require("./tools/predictpeaks.js");
const ptools = require("./tools/predicttools.js");
const money = require("./tools/money.js");
/*
Flatten all incoming trades over defined setting (sauce.smoothing) into two trades (type buy and type sell), 
run calcs, then combine into one combined trade for market prediction
*/
let times = [];
let trades = {0:[],1:[]};
exports.trade = function(trade){
	trade.timestamp = time.timestamp.seconds(trade.timestamp);
	if(!state.start_time) state.start_time = trade.timestamp;
	if(state.start_time < trade.timestamp - sauce.long_average){
		state.dataloss = false;
		state.ready = true;
	}
	trades[trade.type].push(trade);
	times.push(trade.timestamp);

	if(trade.timestamp - times[0] > sauce.smoothing){
		
		//the supertrade object which will be returned for prediction calcs
		const Trade = {
			timestamp:0,
			price:0
		};

		//the new trades, which will be the sum average of each trade type (ie. buy / sell) over the smoothing time
		let newtrades = {}; 	
		for (let k=0;k < 2; k++){
			for (let i=0; i < trades[k].length; i++) {
				if(!newtrades[k]) newtrades[k] = {vol:0};
				let t = trades[k][i];
				let keys = Object.keys(t);
								
				for (let j=0; j < keys.length; j++){
					let k2 = keys[j];
					if(k2 === "type"){
						newtrades[k][k2] = k*1;
					}else{
						if(!newtrades[k][k2]) newtrades[k][k2] = 0;
						newtrades[k][k2] += t[k2];
						//newtrades[k].vol += t.price*t.amount; //calculate volume for each trade before rounding
					}
				}
								
			}
		}
		
		let keys = Object.keys(newtrades);
		for (let i =0;i<keys.length;i++){
			let t = newtrades[keys[i]];
			t.timestamp = time.timestamp.seconds(t.timestamp/trades[t.type].length);			
						
			t.price = money.round.fiat(t.price/trades[t.type].length);
			
			t.amount = money.round.crypto(t.amount/trades[t.type].length);
			t.vol = money.round.fiat(t.price*t.amount);
		}
		
		if(!newtrades[0]||!newtrades[1]){
			newtrades = [newtrades[0]||newtrades[1]];
		}else{
			newtrades = newtrades[0].timestamp < newtrades[1].timestamp?[newtrades[0],newtrades[1]]:[newtrades[1],newtrades[0]]
		}

		//run calcs and combine trades to one;
		for(let i=0;i < newtrades.length; i++){
			let trade = newtrades[i];
			Calc.startprice(trade);
			Calc.rate(trade);
			Trade.timestamp += trade.timestamp;
			Trade.price += trade.price;
		}

		//do rounding
		Trade.timestamp = time.timestamp.seconds(Trade.timestamp/newtrades.length);
		Trade.price = money.round.fiat(Trade.price/newtrades.length);
		state.speed = money.round.crypto(state.speed);
		state.inertia = money.round.fiat(state.inertia);
		state.trend = money.round.fiat(state.trend);
		state.incline = money.round.fiat(state.incline);
		state.orders = money.round.fiat(state.orders);

		//finish and write/return
		const ready = ptools.ready();
		peaks.Peak(ready);
		const item = getItems(Trade,state);
		if(ready) checkEmergency(Trade);

		File.goWrite("Trade",item);
		trades = {0:[],1:[]};
		times = [];
		
		return ready?Trade:false;
	}
	return false;
};

function checkEmergency(trade){
	const test = new Test(trade);
	let prev = state.triggers.emergency;
	if(!state.triggers.emergency && state.first_trade){		
		let emergency = test.emergency[state.trade_dir]();
		if(emergency){
			if(!prev) prev = "new";
			state.triggers.emergency = trade.timestamp;
		}
	}
	if(prev!=="new" && state.first_trade && state.triggers.emergency){		
		state.trade_dir === "sell"?
			trade.price > (state.prev_price_target - sauce.emergency.limit)?eReset(trade):null:
			trade.price < (state.prev_price_target + sauce.emergency.limit)?eReset(trade):null;
	}
}
function eReset(trade){
	//console.log(`[${time.datestamp(trade.timestamp).log}] RESET EMERGENCY`);
	state.triggers.emergency = false;
	state.price_target = state.prev_price_target;
}
