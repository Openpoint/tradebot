"use strict";

const {state,vars} = require("../globals.js");

const round = exports.round = {
	fiat:function(f){
		return Math.round(f*100)/100;
	},
	crypto:function(c){
		return Math.round(c*100000000)/100000000;
	}
};

exports.string = {
	fiat:function(f){
		f = f.toString().split(".");
		if (f.length < 2) return f+".00"; 
		if(f[1].length > 2) f[1] = f[1].slice(0,2);
		if(f[1].length < 2) f[1] += "0";
		return f.join(".");
	},
	crypto:function(f){
		f = f.toString().split(".");
		if (f.length < 2) return f+".00000000";
		if(f[1].length > 8) f[1] = f[1].slice(0,8);
		if(f[1].length < 8){
			let i = 8 - f[1].length;
			while(i > 0){
				f[1] += "0";
				i--;
			}			
		}
		return f.join(".");		
	}
};

exports.bid = function(val){
	if (state.trade_dir === "buy"){
		val += fee(val);
		val += fee(val);
	}else{
		val -= fee(val);
		val -= fee(val);
	}
	return round.fiat(val);
};

const fee = exports.fee = function(val){
	return val*(vars.expense/100);
};

exports.expense = function(vol){
	if(vol < 20000){
		vars.expense = 0.25;
		return;
	}
	if(vol < 100000){
		vars.expense = 0.24;
		return;
	}
	if(vol < 200000){
		vars.expense = 0.22;
		return;
	}
	if(vol < 400000){
		vars.expense = 0.20;
		return;
	}
	if(vol < 600000){
		vars.expense = 0.15;
		return;
	}
	if(vol < 1000000){
		vars.expense = 0.14;
		return;
	}
	if(vol < 2000000){
		vars.expense = 0.13;
		return;
	}
	if(vol < 4000000){
		vars.expense = 0.12;
		return;
	}
	if(vol < 20000000){
		vars.expense = 0.11;
		return;
	}
	if(vol >= 20000000){
		vars.expense = 0.10;
	}
};