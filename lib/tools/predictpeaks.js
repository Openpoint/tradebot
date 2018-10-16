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
};

const initPeaks = module.exports.initPeaks = function(ready){
	const p = {};
	for(let key of Object.keys(sauce.limits)){
		p[key]=ready?state[key]:0;
	}
	return p;
};