"use strict";

const {sauce,state} = require("../globals.js");

const weights = module.exports.weights = {};
const segments = sauce.decay_time/sauce.smoothing;
module.exports.set = function(){
	const keys = Object.keys(sauce.weights);
	for(let i=0;i<keys.length;i++){
		let k = keys[i];
		let st = Math.abs(state[k]);
		if(!weights[k]) weights[k] = [sauce.weights[k],st,st/segments];
		st >= weights[k][1]?reset(k,st):reduce(k,st);
	}
};

function reset(k,st){
	weights[k] = [sauce.weights[k],st,st/segments];
}
function reduce(k,st){
	const factor = st/weights[k][1];
	weights[k][0] = Math.round(sauce.weights[k]*factor);
	weights[k][1]-=weights[k][2];
}