"use strict";

const {sauce,state} = require("../globals.js");
const time = require("./time.js");

module.exports.Test = function(This){
	this.timediff = ()=>{
		const diff = This.trade.timestamp - This.cliffstart.timestamp < sauce.cliff.time;
		return diff||this.pricediff();
	};
	this.pricediff = ()=>{
		return This.profitable() && Math.abs(This.trade.price - state.price_target) > sauce.cliff.price;
	};
	this.trending ={
		sell:()=>{
			return state.trend > sauce.cliff.trend;
		},
		buy:()=>{
			return state.trend < sauce.cliff.trend*-1;
		}
	};
	this.trendEnd = {
		sell:()=>{
			return state.trend < sauce.cliff.trend && (
				state.ispeaked.speed||
				state.ispeaked.inertia||
				(state.inertia < sauce.limits[1]*-1 && state.speed < sauce.limits.speed[1]*-1)
			);
		},
		buy:()=>{
			return state.trend > sauce.cliff.trend*-1 && (
				state.ispeaked.speed||
				//state.ispeaked.inertia||
				(state.inertia > sauce.limits[1] && state.speed > sauce.limits.speed[1])
			);
		}
	};
	this.cliff={

		isCliff:{
			sell:()=>{
				return state.inclineshort > sauce.cliff.price && state.incline > sauce.limits.incline[0];
			},
			buy:()=>{
				return state.inclineshort < sauce.cliff.price*-1 && state.incline < sauce.limits.incline[0]*-1;
			}
		},
		good:()=>{
			return this.timediff() && This.profitable() && (
				this.trendEnd[state.trade_dir]()||this.cliff.isCliff[state.opp_trade_dir]()
			);
		},
		reset:(good)=>{
			const diff = state.trade_dir === "sell"?
				This.trade.price-This.cliffstart.price:
				This.cliffstart.price - This.trade.price;
			const speed = state.trade_dir === "sell"?
				state.speed > sauce.limits.speed[1] && state.trend < sauce.cliff.trend:
				state.speed < sauce.limits.speed[1]*-1 && state.trend > sauce.cliff.trend*-1;

			const cancel = good && state.first_trade && !This.profitable();
			const steep = good && diff > sauce.emergency.limit && this.trendEnd[state.trade_dir]();
			const backswing = good && this.cliff.isCliff[state.opp_trade_dir]() && speed;
			const endtrend = !good && this.trendEnd[state.trade_dir]();

			return cancel||steep||backswing||endtrend;
		}
	};
	this.emergency = {
		time:This.timestamp - state.last_profit_time - sauce.emergency.cut > 0,
		price:(This.price - state.price_target)*(state.trade_dir==="sell"?-1:1) > sauce.emergency.limit,
		sell:()=>{
			return (
				(this.emergency.time && this.emergency.price)||
				(this.emergency.price && state.incline < sauce.cliff.price*-1)
			);
		},
		buy:()=>{
			return (
				(this.emergency.time && this.emergency.price)||
				(this.emergency.price && state.incline > sauce.cliff.price)
			);
		}
	};
};