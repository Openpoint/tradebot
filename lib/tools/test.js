"use strict";

const {sauce,state} = require("../globals.js");
const time = require("./time");

const Test = module.exports.Test = function(that){
	if(!that) that = {};
	this.normal = ()=>{
		//if(state.trade_dir === "buy" && this.cliff.isCliff(state.opp_trade_dir)) console.log(time.datestamp(that.trade.timestamp).log,this.inertia.reverse(),this.speed.reverse())
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
				this.trendEnd()||
				this.cliff.isCliff(state.opp_trade_dir)||
				(
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
			//const steep = good && this.resetdiff(that) && this.trendEnd();
			const backswing = good && this.cliff.isCliff(state.opp_trade_dir) && this.resetspeed();
			const endtrend = !good && this.trendEnd();
			const endtime = !good && (that.trade.timestamp - that.cliffstart.timestamp) > sauce.cliff.time;
			state.debug.cliffreason = {cancel/*,steep*/,backswing,endtrend,endtime};
			return cancel/*||steep*/||backswing||endtrend||endtime;
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
			this.speed.bottom(dir)
		)||(
			state.inertia < sauce.glutlimits.inertia[1] && state.inertia > sauce.glutlimits.inertia[1]*-1 &&
			state.speed < sauce.glutlimits.speed[1] && state.speed > sauce.glutlimits.speed[1]*-1 &&
			state.orders < sauce.glutlimits.orders[1] && state.orders > sauce.glutlimits.orders[1]*-1 &&
			state.incline < sauce.glutlimits.incline[1] && state.incline > sauce.glutlimits.incline[1]*-1
		)
	);
};
Test.prototype.normalTrendEnd = function(){
	return state.trade_dir === "sell"?
		state.trend < sauce.limits.trend[0] && (state.incline < sauce.limits.incline[0]||state.triggered.doldrum > state.trend):
		state.trend > sauce.limits.trend[0]*-1 && (state.incline > sauce.limits.incline[0]*-1||state.triggered.doldrum < state.trend);
};
Test.prototype.pricediff = function(that){
	return that.profitable() && (
		!state.first_trade||
		this.cliff.isCliff(state.opp_trade_dir)||
		Math.abs(that.trade.price - state.price_target) >= sauce.cliff.price
	);
};
Test.prototype.cliffTrend = function(){
	return state.trade_dir === "sell"?
		state.trend > sauce.glutlimits.trend[0]:
		state.trend < sauce.glutlimits.trend[0]*-1;
};
Test.prototype.resetdiff = function(that){
	return state.trade_dir === "sell"?
		(that.trade.price-that.cliffstart.price) > sauce.emergency.limit && this.trendEnd():
		(that.cliffstart.price - that.trade.price) > sauce.emergency.limit && this.trendEnd();
};

Test.prototype.resetspeed = function(){
	return this.speed.good() && this.inertia.good() && this.trend.bottom();
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