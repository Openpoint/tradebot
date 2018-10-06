"use strict";

const {sauce,state} = require("./globals.js");
const smooth = require("./smooth.js");
const ptools = require("./tools/predicttools.js");
const peaks = require("./tools/predictpeaks.js");
const decay = require("./tools/decay.js");
const glutlimits = sauce.glutlimits;
const limits = sauce.limits;

const check = new Check();
module.exports.addTrade = function(trade){
	trade = smooth.trade(trade);
	if(!trade) return;
		
	check.setTrade(trade);
	check.init();
	check.poll();

	/*
	if(!state.triggers.emergency && state.triggers.wait){
		check.init();
		check.hold();
		//good = check.hold();
		//good = check.init();
	}else{
		good = check.init();
	}
	*/	
	//if(!good && state.triggers.emergency) good = check.e.cliff;		
	if(check.good){
		check.wait = false;
		ptools.goTrade(check);
	}
};

Check.prototype.poll = function(){
	if(!this.good && !this.wait) return;
	let profit = this.profitable();
	this.good = 
		profit; //&&
		//state.ispeaked.inclineshort;
		//(state.ispeaked.inertia||state.ispeaked.inclinelong) && this.profitable();
	if(!this.good){
		this.wait = profit;
	}
};

function Check(){
	this.setTrade = function(trade){
		this.trade = trade;
	};
	this.e = {};	
}

Check.prototype.init = function(){
	this.heat();	
	peaks.peaked();
	//this.emergency();
	let checked = {
		inertia:this.isGood("inertia"),
		trend:this.isGood("trend"),
		speed:this.isGood("speed"),
		orders:this.isGood("orders"),
		inclineshort:this.isGood("inclineshort"),
		inclinelong:this.isGood("inclinelong"),
	};
	
	let count = 0;
	let keys = Object.keys(checked);
	for(let i=0;i < keys.length;i++){
		let k = keys[i];	
		if(checked[k]) count+=sauce.weights[k];
	}
	state.triggered.good = count;
	//let bonus = state.trade_dir==="sell"?this.trade.price-state.price_target:state.price_target-this.trade.price;
	state.triggered.total = Math.round(
		state.triggered.peaked + 
		state.triggered.good //+ 
		//state.triggered.glut - 
		//state.triggered.doldrum + 
	);
	
	
	const total = state.triggered.total >= sauce.triggers.total;
	//state.triggers.good = state.triggered.good >= sauce.triggers.good;
	let good = this.profitable() && state.triggers.peaked && total;
	this.good = good;
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
	let count = 0;
	let count2 = 0;
	for(let i=0;i<a.length;i++){
		let k = a[i];
		if(state[k] > glutlimits[k][0] || state[k] < glutlimits[k][0]*-1) count+= sauce.weights[k];
		if(state[k] < glutlimits[k][1] && state[k] > glutlimits[k][1]*-1) count2+= sauce.weights[k];
	}
	state.triggered.glut = count;
	state.triggered.doldrum = count2;

};

Check.prototype.emergency = function(){
	let cliff = state.trade_dir === "sell"?
		state.triggers.emergency && state.inclineshort < sauce.triggers.price*-1||
		state.peaks.inclineshort > sauce.triggers.price //||
		//state.peaks.inclinelong > sauce.triggers.pricelong
		:
		state.triggers.emergency && state.inclineshort > sauce.triggers.price||
		state.peaks.inclineshort < sauce.triggers.price*-1;//||
		//state.peaks.inclinelong < sauce.triggers.pricelong*-1;
	if(cliff && !state.triggers.emergency){		
		cliff = this.profitable();
		state.triggers.wait = cliff;
	}else{
		state.triggers.wait = true;
	}
	this.e = {
		stuck:state.triggers.emergency,
		cliff:cliff
	};
};


Check.prototype.hold = function(){	
	if(!this.profitable()){
		state.triggers.wait = false;
		this.e.cliff = false;		
		return false;
	}
	if(this.e.cliff  && state.ispeaked.inclineshort) state.triggers.wait = false;
	if(!this.e.cliff  && (state.ispeaked.inclinelong||state.ispeaked.inertia)) state.triggers.wait = false;
};
