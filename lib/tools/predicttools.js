"use strict";

const {state,sauce} = require("../globals.js");
const {Log} = require("../logging.js");
const Calc = require("../calc.js");
const tools = require("./calctools.js");

module.exports.getPrev = function(empty,trade){
	return {
		price:empty?0:trade.price,
		speed:empty?0:state.speed,
		inertia:empty?0:state.inertia,
		orders:empty?0:state.orders,
		incline:empty?0:state.incline,
		trend:empty?0:state.trend
	};
};


module.exports.backswing = function(key){
	let bs =  sauce.limits[key][1];
	let p = state.peaks[key];
	p = p<0?p*-1:p;
	if(p < bs) bs = p;
	return bs;
};
module.exports.goTrade = function(This){
	if(!state.dev){
		state.inTrade = true;
		Calc.setwallet((err)=>{
			if(err){
				Log.error(err);
				state.inTrade = false;
				return;
			}
			Calc.wallet(This,(err,item)=>{
				if(err && !item){
					Log.error("Trade error: %s",err);
					state.inTrade = false;
					return;
				}
				if(err) Log.error(err);
				tools.finishTrade(This.trade,item);
				state.inTrade = false;
			});
		});
	}else{
		Calc.wallet(This,(err,item)=>{
			tools.finishTrade(This.trade,item);	
		});
	}	
};

exports.ready = function(){
	return state.ready && !state.inTrade;
};



