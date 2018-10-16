"use strict";

let state,vars;
const Ex = {};

Ex.initMoney = function(){
	let G = require("../globals.js");
	vars = G.vars;
	state = G.state;
};

const crypto = Ex.crypto = 100000000;
const fiat = Ex.fiat = 100;
const factor = Ex.factor = crypto*fiat;

Number.prototype.factor = function(){
	return this*factor;
};
Number.prototype.toFiat = function(){
	return Math.round(this/crypto)/fiat;
};
Number.prototype.toCrypto = function(){
	return Math.round(this/fiat)/crypto;
};
Number.prototype.round = function(){
	return Math.round(this);
};

const round = Ex.round = {
	fiat:function(f){
		return Math.round(f*fiat)/fiat;
	},
	crypto:function(c){
		return Math.round(c*crypto)/crypto;
	}
};

Ex.string = {
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

Ex.bid = function(val){
	if (state.trade_dir === "buy"){
		val += fee(val);
		val += fee(val);
	}else{
		val -= fee(val);
		val -= fee(val);
	}
	return round.fiat(val);
};

const fee = Ex.fee = function(val){
	return val*(vars.expense/100);
};

Ex.expense = function(vol){
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

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory);
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.money = factory();
	}
}(typeof self !== "undefined" ? self : this, function () {
	return Ex;
}));