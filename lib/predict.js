"use strict";

const {sauce,state} = require("./globals.js");
const smooth = require("./smooth.js");
const {Log} = require("./logging");
const ptools = require("./tools/predicttools.js");
const {Test} = require("./tools/test.js");
const time = require("./tools/time");
const glutlimits = sauce.glutlimits;
const limits = sauce.limits;

const check = new Check();
module.exports.addTrade = function(trade){
	trade = smooth.trade(trade);	
	if(!trade) return;
	check.trade = trade;
	check.test = new Test(check);
	check.init();
	check.poll();
	if(check.good && !check.wait){
		ptools.goTrade(check);
		state.condition = "normal";
	}	
};

function Check(){
	this.e = {};
	state.condition = "normal";
	this.conditions = {
		first:()=>{

			let good = state.trade_dir === "sell"?
				state.isPeaked.incline && state.incline > limits.incline[0]
				:
				state.isPeaked.incline && state.incline < limits.incline[0]*-1;
			if(good) this.wait = false;
			return good;
		},
		normal:(fromCliff)=>{
			this.e.stuck = false;
			this.e.cliff = false;
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
				this.e.stuck = false;
				this.cliff();
				return this.conditions[state.condition]();
			}
			this.e.stuck = true;
			this.e.cliff = false;
			state.triggers.cliff = false;
			let good = this.test.trendEnd();
			if(good) {
				if(state.loglevel > 1) Log.info(`[${time.datestamp(this.trade.timestamp).log}] Emergency Trade: "${JSON.stringify(state.debug.emergencyreason,null,"\t")}"`);
				this.wait = false;
			}
			return good;
		},
		cliff:()=>{
			this.e.cliff = true;
			state.triggers.cliff = true;
			if(this.test.cliff.isCliff()) this.cliffstart = {price:state.price_average,timestamp:this.trade.timestamp}; 
			let good = this.test.cliff.good();			
			if(this.test.cliff.reset(good)){
				if(state.loglevel > 1 && state.condition!=="normal") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Cliff was reset: "${JSON.stringify(state.debug.cliffreason,null,"\t")}"`);
				state.peaks.trend = state.trend;
				this.init();
				state.condition = "normal";
				good = this.conditions.normal(true);
			}
			if(good) this.wait = false;
			return good;
		},
		ecliff:()=>{
			this.e.cliff = true;
			state.triggers.cliff = true;
			this.wait = false;
			return true;
		},
	};
}

Check.prototype.poll = function(){
	if(state.triggers.emergency){
		this.emergency();
	}else if(state.condition === "normal"){
		this.cliff();
	}
	this.good = this.conditions[state.condition]();
};

Check.prototype.emergency = function(){
	let ecliff;
	this.e.stuck = true;
	if(state.trade_dir === "sell"){
		ecliff = state.inclineshort <= sauce.cliff.price*-1;
	}else{
		ecliff = state.inclineshort >= sauce.cliff.price;
	}
	if(ecliff){
		if(state.loglevel > 1 && state.condition !== "ecliff") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition went to "ecliff" from "${state.condition}"`);
		state.condition = "ecliff";
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
		this.e.cliff = true;
	}else{
		if(state.loglevel > 1 && state.condition!=="normal") Log.info(`[${time.datestamp(this.trade.timestamp).log}] Condition to "normal" from "${state.condition}"`);
		state.condition = "normal";
	}
};

Check.prototype.init = function(){

	this.heat();
	let keys = Object.keys(sauce.weights);
	let count = 0;
	for(let i=0;i < keys.length;i++){
		let k = keys[i];
		if(this.isGood(k)) count+=sauce.weights[k];
	}
	/*
	let diff = state.trade_dir === "sell"?
		this.trade.price - state.price_target:
		state.price_target - this.trade.price;
	*/
	state.triggered.good = count;
	state.triggered.total = (
		state.triggered.peaks +
		state.triggered.good +
		state.triggered.glut +
		//(state.trade_dir==="sell"?state.triggered.doldrum:state.triggered.doldrum*-1) +
		(state.trade_dir==="sell"?state.trend:state.trend*-1) //+
		//diff
	).round();
	const total = state.triggered.total >= sauce.triggers.total;
	let good = this.profitable() && total;
	this.good = good;
	this.wait = true;
};


Check.prototype.profitable = function(){
	let good =  state.trade_dir === "sell"?
		this.trade.price > state.price_target
		:
		this.trade.price < state.price_target;
	state.triggers.profit = good;
	return good;
};
Check.prototype.isGood = function(key){
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
		if(state[k] > glutlimits[k][0] || state[k] < glutlimits[k][0]*-1) glut+= sauce.weights[k];
		if(state.isPeaked[k] && state[k] < glutlimits[k][1] && state[k] > glutlimits[k][1]*-1) doldrum+= state[k];
		if(state.isPeaked[k]) peaks += sauce.weights[k];
	}
	
	state.triggered.glut = glut;
	state.triggered.doldrum = doldrum;
	state.triggered.peaks = peaks;
};


