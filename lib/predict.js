"use strict";

const smooth = require("./tools/smooth.js");
const ptools = require("./tools/predicttools.js");
const peaks = require("./tools/predictpeaks.js");
const glutlimits = sauce.glutlimits;
const limits = sauce.limits;
let peak = {};
let prev = new ptools.getPrev(true);

module.exports.addTrade = function(trade){	

	trade = smooth.trade(trade);
	if(!trade) return;
	const check = new Check(trade);
	const d = state.dev?true:state.loaded;
	const e = d?ptools.emergencyaction(trade):false;
	let good;
	
	if(state.gogood){
		//console.log('state is good')
		good = check.cliff(trade);
	}else{
		good = !state.inTrade && state.ready && d;
		good = good?(e || check.init(trade)):false;
		state.gogood = good;
		if(good) good = check.cliff(trade);
		//let c = good?false:check.cliff(trade);
	}
	
	if(good){
		state.gogood = false;
		ptools.message(e);
		ptools.goTrade(trade,peak,prev);
	}
	prev = new ptools.getPrev(false,trade,prev);
	if(!state.emergency) prev.price_target = state.price_target;
};

function Check(trade){
	peak = state.peaks = peaks.Peak(peak,prev);
	ptools.resetEmergency(trade,prev);
}

Check.prototype.init = function(trade){
	this.glut(trade);
	peaks.peaked(peak);
	if(!state.ready)return false;
	let good = false;		
	if(state.peaked && this.profitable(trade)){
		good = [
			this.sentiment(trade),
			this.inertia(trade),
			((state.glut||state.doldrum)?
				//(this.speed() || this.incline()) && (this.orders() || this.incline()):
				(this.speed() && this.orders() && this.incline())
				:	
				(this.speed() || this.orders() || this.incline())
			)				
		];
		//console.log(time.datestamp(trade.timestamp).log,good)
		good = good[0] && good[1] && good[2];

	}					
	return good;
};

Check.prototype.cliff = function(trade){
	let steep;
	state.trade_dir === "sell"?
		steep = 
			state.price_incline < 0 && 
			(state.trade_inertia < 0 || state.sentiment < 0 || state.speed < 0) && 
			this.profitable(trade)
		:		
		steep = 
			state.price_incline > 0 && 
			(state.trade_inertia > 0 || state.sentiment > 0 || state.speed > 0) && 
			this.profitable(trade);

	return steep;
};

Check.prototype.glut = function(){
	let glut;
	if(state.trade_dir === "sell"){
		if(state.glut && (state.trade_inertia > limits.inertia[0]||state.sentiment > limits.sentiment[0])) return true;
		glut = 
			(state.trade_inertia > glutlimits.inertia[0] && state.sentiment > glutlimits.sentiment[0]) ||
			state.trade_inertia > glutlimits.inertia[0]*2 ||
			state.sentiment > glutlimits.sentiment[0]*2;
	}else{
		if(state.glut && (state.trade_inertia < limits.inertia[0]*-1||state.sentiment < limits.sentiment[0]*-1)) return true;
		glut = 
			(state.trade_inertia < glutlimits.inertia[0]*-1 && state.sentiment < glutlimits.sentiment[0]*-1) ||
			state.trade_inertia < glutlimits.inertia[0]*-2 ||
			state.sentiment < glutlimits.sentiment[0]*-2;
	}
	if(glut){
		peak.inertia = state.trade_inertia;
		peak.sentiment = state.sentiment;
	}
	state.glut = glut;
	const dd = [
		(
			state.trade_inertia < glutlimits.inertia[1] && 
			state.trade_inertia > glutlimits.inertia[1]*-1
		),(
			state.sentiment < glutlimits.sentiment[1] && 
			state.sentiment > glutlimits.sentiment[1]*-1
		),(
			state.orders < glutlimits.orders[1] && 
			state.orders > glutlimits.orders[1]*-1 &&
			state.speed < glutlimits.speed[1] &&
			state.speed > glutlimits.speed[1]*-1
		),(
			state.price_incline < glutlimits.incline[1] &&
			state.price_incline > glutlimits.incline[1]*-1
		)
	];
	state.doldrum = (dd[0] && dd[1])||(dd[0] && dd[2])||(dd[1] && dd[2])||(dd[2] && dd[3]);
	//console.log(dd);
};

Check.prototype.profitable = function(trade){	
	
	let good =  state.trade_dir === "sell"?
		//trade.price > state.price_average &&
		//trade.price > state.price_short_average + sauce.limits.profitable[0] &&
		//state.price_incline < 5 &&		
		//trade.price < prev.price + limits.profitable[0] &&
		trade.price > state.price_target:

		//state.price_incline >  -5 &&
		//trade.price < state.price_average &&
		//trade.price < state.price_short_average - sauce.limits.profitable[0] &&		
		//trade.price > prev.price - limits.profitable[0] &&
		trade.price < state.price_target;
	if(!good) state.gogood = false;
	return good;
};

Check.prototype.sentiment = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === "sell"?
		peak.sentiment > limits.sentiment[0] && 
		state.sentiment > (glut?
			limits.sentiment[0]*-1:
			peak.sentiment*-1
		):

		peak.sentiment < limits.sentiment[0]*-1 
		&& state.sentiment < (glut?
			limits.sentiment[0]:
			peak.sentiment*-1
		);
};

Check.prototype.inertia = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === "sell"?
		peak.inertia > limits.inertia[0] && state.trade_inertia > (glut?limits.inertia[0]*-1:peak.inertia*-1):
		peak.inertia < limits.inertia[0]*-1 && state.trade_inertia < (glut?limits.inertia[0]:peak.inertia*-1);
};

Check.prototype.speed = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === "sell"?
		peak.speed > limits.speed[0] && 
		state.speed > (glut?limits.speed[0]*-1:peak.speed*-1):

		peak.speed < limits.speed[0]*-1 && 
		state.speed < (glut?limits.speed[0]:peak.speed*-1);
};
Check.prototype.orders = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === "sell"?
		peak.orders >= limits.orders[0] && 
		state.orders > (glut?limits.orders[0]*-1:peak.orders *-1):

		peak.orders <= limits.orders[0]*-1 && 
		state.orders < (glut?limits.orders[0]:peak.orders *-1);
};
Check.prototype.incline = function(){
	return state.trade_dir === "sell"?
		peak.incline > limits.incline[0] && 
		state.price_incline > 0:
		peak.incline < limits.incline[0]*-1 && 
		state.price_incline < 0;
};
