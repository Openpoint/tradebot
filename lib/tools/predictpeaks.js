"use strict";

const {sauce,state} = require("../globals.js");
let {Test} = require("./test");
const test = new Test();

module.exports.Peak = function(ready){
	if(!state.peaks||!ready){
		state.peaks = initPeaks(ready);
		return;
	}
	for(let key of Object.keys(sauce.limits)){
		if(test[key].bottom()){
			state.peaks[key] = state[key];
		}else{
			state.peaks[key] = test[key].peak()?state[key]:state.peaks[key];
		}
		state.isPeaked[key] = test[key].peaked();
	}
	if(state.trade_dir === "sell"){
		state.peaks.price = state.price_average > state.peaks.price?state.price_average:state.peaks.price;
	}else{
		state.peaks.price = state.price_average < state.peaks.price?state.price_average:state.peaks.price;
	}
};

const initPeaks = module.exports.initPeaks = function(ready){
	const peaks = {};
	for(let key of Object.keys(sauce.limits)){
		peaks[key]=ready?state[key]:0;
	}
	peaks.price = state.price_average;
	return peaks;
};