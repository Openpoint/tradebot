"use strict";

const {sauce,state} = require("./globals.js");
const smooth = require("./smooth.js");
const {Log} = require("./logging");
const ptools = require("./tools/predicttools.js");
const {Test} = require("./tools/test.js");
const Calc = require("./calc");
const time = require("./tools/time");
const limits = sauce.limits;

const check = new Check();

module.exports.addTrade = function(trade){
	smooth.trade(trade,function(Trade){
		if(!Trade) return;
		check.trade = Trade;
		check.test = new Test(check);
		check.newTrade();
		check.poll();
		if(check.good && !check.wait){
			Calc.goTrade(check);
			state.condition = "normal";
		}
	});
};

function Check(){
	this.logMessage = {};
	state.condition = "normal";
	this.conditions = {
		normal:(fromCliff)=>{
			this.logMessage.stuck = false;
			this.logMessage.cliff = false;
			state.triggers.cliff = false;
			if(!state.triggered.total) state.triggers.normal = false;
			if(!state.triggers.normal) state.triggers.normal = this.good||fromCliff||this.test.cliff.isCliff(state.opp_trade_dir);
			const profit = this.profitable();
			if(state.triggers.normal && profit && this.test.normal()){
				this.wait = false;
				state.triggers.normal = false;
				return true;
			}
			if(!profit) state.triggers.normal = false;
			return false;
		},
		emergency:()=>{
			if(!state.triggers.emergency){
				this.logMessage.stuck = false;
				this.cliff();
				return this.conditions[state.condition]();
			}
			this.logMessage.stuck = true;
			this.logMessage.cliff = false;
			state.triggers.cliff = false;
			let good = this.test.trendEnd();
			if(good) {
				if(state.loglevel > 1) Log.info(`[${time.datestamp(this.trade.timestamp).log}] Emergency Trade: "${JSON.stringify(state.debug.emergencyreason,null,"\t")}"`);
				this.wait = false;
			}
			return good;
		},
		cliff:()=>{
			this.logMessage.cliff = true;
			state.triggers.cliff = true;
			if(this.test.cliff.isCliff()) this.cliffstart = {price:state.price_average,timestamp:this.trade.timestamp};
			let good = this.test.cliff.good();
			if(this.test.cliff.reset(good)){
				if(state.loglevel > 1 && state.condition!=="normal") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Cliff was reset: "${JSON.stringify(state.debug.cliffreason,null,"\t")}"`);
				state.peaks.trend = state.trend;
				this.newTrade();
				state.condition = "normal";
				good = this.conditions.normal(true);
			}
			if(good) this.wait = false;
			return good;
		},
		emergencyCliff:()=>{
			state.triggers.cliff = true;
			this.logMessage.cliff = true;
			this.wait = false;
			return true;
		}
	};
}

Check.prototype.newTrade = function(){
	this.heat();
	state.triggered.good = 0;
	for(let key of Object.keys(sauce.weights)){
		if(this.isItemGood(key)) state.triggered.good+=sauce.weights[key];
	}
	state.triggered.total = (
		state.triggered.peaks +
		state.triggered.good +
		state.triggered.glut +
		(state.trade_dir==="sell"?state.trend:state.trend*-1)
	).round();
	const total = state.triggered.total >= sauce.triggers.total;
	this.good = this.profitable() && total;
	this.wait = true;
};

Check.prototype.poll = function(){
	if(state.triggers.emergency){
		this.emergency();
	}else if(state.condition === "normal"){
		this.cliff();
	}
	this.good = this.conditions[state.condition]();
};

Check.prototype.emergency = function(){
	let emergencyCliff;
	this.logMessage.stuck = true;
	if(state.trade_dir === "sell"){
		emergencyCliff = state.inclineshort <= sauce.cliff.price*-1;
	}else{
		emergencyCliff = state.inclineshort >= sauce.cliff.price;
	}
	if(emergencyCliff){
		if(state.loglevel > 1 && state.condition !== "emergencyCliff") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition went to "emergencyCliff" from "${state.condition}"`);
		state.condition = "emergencyCliff";
	}else{
		if(state.loglevel > 1 && state.condition !== "emergency") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition went to "emergency" from "${state.condition}"`);
		state.condition = "emergency";
	}
};

Check.prototype.cliff = function(){
	const cliff = this.test.cliff.isCliff();
	if(cliff){
		if(state.loglevel > 1) Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition went to "cliff" from "${state.condition}"`);
		state.condition = "cliff";
		this.logMessage.cliff = true;
	}else{
		if(state.loglevel > 1 && state.condition!=="normal") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition to "normal" from "${state.condition}"`);
		state.condition = "normal";
	}
};

Check.prototype.profitable = function(){
	let good =  state.trade_dir === "sell"?
		this.trade.price > state.price_target
		:
		this.trade.price < state.price_target;
	state.triggers.profit = good;
	return good;
};

Check.prototype.isItemGood = function(key){
	let backswing = ptools.backswing(key);
	const good =  state.trade_dir === "sell"?
		state.peaks[key] > limits[key][0] &&
		state[key] > backswing*-1
		:
		state.peaks[key] < limits[key][0]*-1 &&
		state[key] < backswing;

	state.triggers[key] = good;
	return good;
};

Check.prototype.heat = function(){
	let glut = 0;
	let doldrum = 0;
	let peaks = 0;
	for(let k of Object.keys(sauce.weights)){
		if(state[k] > sauce.glutLimits[k][0] || state[k] < sauce.glutLimits[k][0]*-1) glut+= sauce.weights[k];
		if(state.isPeaked[k] && state[k] < sauce.glutLimits[k][1] && state[k] > sauce.glutLimits[k][1]*-1) doldrum+= state[k];
		if(state.isPeaked[k]) peaks += sauce.weights[k];
	}
	state.triggered.glut = glut;
	state.triggered.doldrum = doldrum;
	state.triggered.peaks = peaks;
};


