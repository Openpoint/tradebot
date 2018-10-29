"use strict";

const {sauce,state} = require("../globals.js");

const Test = module.exports.Test = function(that){
	if(!that) that = {};
	this.normal = ()=>{
		return  (
			state.isPeaked.trend &&
			state.isPeaked.incline &&
			state.isPeaked.speed &&
			this.inertia.good() &&
			this.normalTrendEnd()
		)||(
			this.cliff.isCliff(state.opp_trade_dir) &&
			this.inertia.reverse() &&
			this.speed.reverse() &&
			this.orders.reverse() &&
			this.trend.reverse()
		);
	};

	this.cliff={
		isCliff:(dir)=>{
			return (this.inclineshort(dir) && this.incline.top(dir))||!dir && state.triggered.total >= sauce.cliff.total;
		},
		good:()=>{
			return this.pricediff(that) && (
				this.trendEnd()||(
					this.cliff.isCliff(state.opp_trade_dir)
				)||(
					state.isPeaked.trend &&
					state.isPeaked.inertia &&
					state.isPeaked.speed &&
					state.isPeaked.orders &&
					state.isPeaked.incline &&
					this.cliffTrend()
				)
			);
		},
		reset:(good)=>{
			const cancel = good && state.first_trade && !that.profitable();
			const backswing = good && this.cliff.isCliff(state.opp_trade_dir) && this.resetspeed();
			const endtrend = !good && this.trendEnd();
			const endtime = !good && (that.trade.timestamp - that.cliffstart.timestamp) > sauce.cliff.time;
			state.debug.cliffreason = {cancel,backswing,endtrend,endtime};
			return cancel||backswing||endtrend||endtime;
		}
	};
};

for (let key of Object.keys(sauce.limits)){
	Test.prototype[key] = {};
	Test.prototype[key].bottom = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] < sauce.limits[key][1]:
			state[key] > sauce.limits[key][1]*-1;
	};
	Test.prototype[key].reverse = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] < sauce.limits[key][1]*-1:
			state[key] > sauce.limits[key][1];
	};
	Test.prototype[key].backswing = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] > sauce.limits[key][1]*-1:
			state[key] < sauce.limits[key][1];
	};
	Test.prototype[key].top = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] > sauce.limits[key][0]:
			state[key] < sauce.limits[key][0]*-1;
	};
	Test.prototype[key].good = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] > sauce.limits[key][1]:
			state[key] < sauce.limits[key][1]*-1;
	};
	Test.prototype[key].peak = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state[key] > state.peaks[key]:
			state[key] < state.peaks[key];
	};
	Test.prototype[key].peaked = function(dir){
		return (dir||state.trade_dir) === "sell"?
			state.peaks[key] >= sauce.limits[key][0] && state.peaks[key] - state[key] > sauce.limits[key][1]:
			state.peaks[key] <= sauce.limits[key][0]*-1 && state[key] - state.peaks[key] > sauce.limits[key][1];
	};
}
Test.prototype.inclineshort = function(dir){
	return (dir||state.trade_dir) === "sell"?
		state.inclineshort >= sauce.cliff.price:
		state.inclineshort <= sauce.cliff.price*-1;
};

Test.prototype.trendEnd = function(dir){
	return this.trend.bottom(dir) && (
		(
			state.isPeaked.speed &&
			this.inertia.good()
		)||(
			this.inertia.bottom(dir) &&
			this.speed.bottom(dir) &&
			this.incline.top(dir) //added
		)||(
			state.inertia < sauce.glutLimits.inertia[1] && state.inertia > sauce.glutLimits.inertia[1]*-1 &&
			state.speed < sauce.glutLimits.speed[1] && state.speed > sauce.glutLimits.speed[1]*-1 &&
			state.orders < sauce.glutLimits.orders[1] && state.orders > sauce.glutLimits.orders[1]*-1 &&
			//state.incline < sauce.glutLimits.incline[1] && state.incline > sauce.glutLimits.incline[1]*-1
			this.incline.top(dir) //added
		)
	);
};
Test.prototype.normalTrendEnd = function(){
	return state.trade_dir === "sell"?
		state.trend < sauce.limits.trend[0] && (state.incline < sauce.limits.incline[0]||state.triggered.doldrum > state.trend):
		state.trend > sauce.limits.trend[0]*-1 && (state.incline > sauce.limits.incline[0]*-1||state.triggered.doldrum < state.trend);
};
Test.prototype.pricediff = function(that){
	const diff = Math.abs(that.trade.price - state.price_target) >= sauce.cliff.price;
	return that.profitable() && (
		!state.first_trade||
		this.cliff.isCliff(state.opp_trade_dir)|| diff
		//(diff && (this.betterThanAverage(that)||this.bigDiff()))
	);
};
Test.prototype.cliffTrend = function(){
	return state.trade_dir === "sell"?
		state.trend > sauce.glutLimits.trend[0]:
		state.trend < sauce.glutLimits.trend[0]*-1;
};
Test.prototype.resetdiff = function(that){
	return state.trade_dir === "sell"?
		(that.trade.price-that.cliffstart.price) > sauce.emergency.limit && this.trendEnd():
		(that.cliffstart.price - that.trade.price) > sauce.emergency.limit && this.trendEnd();
};

Test.prototype.resetspeed = function(){
	//return this.speed.good() && this.inertia.good() && this.trend.bottom();
	return this.speed.good() && this.inertia.backswing() && this.trend.bottom();
};

Test.prototype.emergencyincline = function(){
	return state.trade_dir === "sell"?
		state.incline <= sauce.cliff.price*-1:
		state.incline >= sauce.cliff.price;
};

Test.prototype.emergency = function(trade){
	const time = trade.timestamp - state.last_profit_time - sauce.emergency.cut > 0;
	const price = (state.price_average - state.price_target)*(state.trade_dir==="sell"?-1:1) > sauce.emergency.limit;
	const incline = this.emergencyincline();
	const trend = this.trend.reverse();
	state.debug.emergencyreason = {time,price,incline,trend};
	return (trend && time && price)||(trend && price && incline);
};
/*
Test.prototype.betterThanAverage = function(that){
	return state.trade_dir === "sell"?
		that.trade.price > state.price_average:
		that.trade.price < state.price_average;
};

Test.prototype.bigDiff = function(){
	return state.trade_dir === "sell"?
		state.peaks.price - state.price_average > sauce.cliff.price*2:
		state.price_average - state.peaks.price > sauce.cliff.price*2;
};
*/