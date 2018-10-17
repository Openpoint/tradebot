"use strict";

const {state,sauce} = require("../globals.js");

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

exports.ready = function(){
	return (!state.triggers.dataloss||!state.first_trade) && state.ready && !state.inTrade;
};



