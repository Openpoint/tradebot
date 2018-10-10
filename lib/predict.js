"use strict";

const {sauce,state} = require("./globals.js");
const smooth = require("./smooth.js");
const ptools = require("./tools/predicttools.js");
const peaks = require("./tools/predictpeaks.js");
const {Test} = require("./tools/test.js");
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
		check.condition = "normal";
	}
};

function Check(){
	this.e = {};
	this.condition = "normal";
	this.conditions = {
		first:()=>{

			let good = state.trade_dir === "sell"?
				state.ispeaked.incline && state.incline > limits.incline[0]
				:
				state.ispeaked.incline && state.incline < limits.incline[0]*-1;
			if(good) this.wait = false;
			return good;
		},
		normal:()=>{
			this.e.stuck = false;
			this.e.cliff = false;
			state.triggers.cliff = false;
			let good = this.test.trending[state.trade_dir]();
			if(good) good = this.good && this.profitable();
			if(good) this.wait = false;
			return good;
		},
		emergency:()=>{
			if(!state.triggers.emergency){
				this.e.stuck = false;
				this.condition = "cliff";
				return this.conditions.cliff();
			}
			this.e.stuck = true;
			this.e.cliff = false;
			state.triggers.cliff = false;
			let good = this.test.trendEnd[state.trade_dir]();
			if(good) this.wait = false;
			return good;
		},
		cliff:()=>{
			this.e.cliff = true;
			state.triggers.cliff = true;
			let good = this.test.cliff.good();			
			if(this.test.cliff.reset(good)){
				this.init();
				this.condition = "normal";
				good = this.conditions.normal();
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
	}else if(this.condition === "normal"){
		this.cliff();
	}
	this.good = this.conditions[this.condition]();
};

Check.prototype.emergency = function(){
	let ecliff;
	this.e.stuck = true;
	if(state.trade_dir === "sell"){
		ecliff = state.inclineshort < sauce.cliff.price*-1;
	}else{
		ecliff = state.inclineshort > sauce.cliff.price;
	}
	if(ecliff){
		this.condition = "ecliff";
	}else{
		this.condition = "emergency";
	}
};

Check.prototype.cliff = function(){
	const cliff = this.test.cliff.isCliff[state.trade_dir]();
	if(cliff){
		this.cliffstart = {price:state.price_average,timestamp:this.trade.timestamp};
		this.condition = "cliff";
		this.e.cliff = true;
	}else{
		this.condition = "normal";
	}
};

Check.prototype.init = function(){	
	peaks.peaked();
	this.heat();
	let keys = Object.keys(sauce.weights);
	let count = 0;
	for(let i=0;i < keys.length;i++){
		let k = keys[i];
		if(this.isGood(k)) count+=sauce.weights[k];
	}
	state.triggered.good = count;
	state.triggered.total = Math.round(
		state.triggered.peaked +
		state.triggered.good +
		state.triggered.glut +
		(state.trade_dir==="sell"?state.triggered.doldrum:state.triggered.doldrum*-1) +
		(state.trade_dir==="sell"?state.trend:state.trend*-1)
	);
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
	let a = Object.keys(sauce.weights);
	let glut = 0;
	let doldrum = 0;
	for(let i=0;i<a.length;i++){
		let k = a[i];
		if(state[k] > glutlimits[k][0] || state[k] < glutlimits[k][0]*-1) glut+= sauce.weights[k];
		if(state.ispeaked[k] && state[k] < glutlimits[k][1] && state[k] > glutlimits[k][1]*-1) doldrum+= state[k];
	}
	state.triggered.glut = glut;
	state.triggered.doldrum = doldrum;
};


