"use strict";

const {sauce,state} = require("../globals.js");
const limits = sauce.limits;

module.exports.Peak = function(ready){
	if(!state.peaks||!ready){
		state.peaks = initPeaks(ready);
		return;
	}
	const P = {};
	const keys = Object.keys(sauce.weights);
	for(let i=0;i<keys.length;i++){
		let k = keys[i];		
		if(state.trade_dir === "sell"){
			if(state[k] < limits[k][1]){
				P[k] = state[k];
			}else{
				P[k] = (state[k] > state.peaks[k])?state[k]:state.peaks[k];
			} 		
		}else{
			if(state[k] > limits[k][1]*-1){
				P[k] = state[k];
			}else{
				P[k] = (state[k] < state.peaks[k])?state[k]:state.peaks[k];
			}		
		}
	}
	state.peaks = P;
};

module.exports.peaked = function(){
	peaks();
	let g = state.ispeaked;
	let all = Object.keys(sauce.weights);
	let count = 0;
	for(let i=0;i<all.length;i++){
		let k = all[i];
		if(g[k]) count+=sauce.weights[k];	
	}
	state.triggered.peaked = count;
};

const initPeaks = module.exports.initPeaks = function(ready){
	const p = {};
	const keys = Object.keys(sauce.weights);
	for(let i=0;i<keys.length;i++){
		const k = keys[i];
		p[k]=ready?state[k]:0;
	}
	return p;
};

function peaks(){
	const peaks = state.peaks;
	const keys = Object.keys(limits);
	const P = {};
	for(let i=0;i<keys.length;i++){
		let k = keys[i];		
		if(state.trade_dir === "sell"){
			P[k] = peaks[k] >= limits[k][0] && peaks[k] - state[k] > limits[k][1];
		}else{
			P[k] = peaks[k] <= limits[k][0]*-1 && state[k] - peaks[k] > limits[k][1];
		}
	}
	state.ispeaked = P;
}