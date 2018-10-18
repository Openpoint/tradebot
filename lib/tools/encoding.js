"use strict";

const keys = {
	trade:["timestamp","price","dir","trend","inertia","speed","incline","orders","target","triggered"],
	extra:["average","peaks","triggers","inclineshort","inclinelong"],
	peaks:["inertia","speed","orders","incline","trend"],
	triggered:["glut","doldrum","peaks","good","total"],	
	triggers:["emergency","inertia","speed","orders","incline","profit","cliff","dataloss"],
	wallet:["fiat","coin"]
};
keys.buysell = [...keys.trade,"wallet"];
keys.Trade = keys.trade.concat(keys.extra);

function common(trade,price,state){
	return {
		timestamp:trade.timestamp*1000,
		price:price||trade.price,
		dir:state.trade_dir,
		trend:state.trend,
		inertia:state.inertia,
		speed:state.speed,
		incline:state.incline,
		orders:state.orders,
		target:state.price_target,
		triggered:encode(state.triggered,"triggered")
	};
}
function getItems(trade,state){
	return encode(common(trade,false,state),"trade").concat(encode({
		average:state.price_average,
		peaks:encode(state.peaks,"peaks"),
		triggers:encode(state.triggers,"triggers"),
		inclineshort:state.inclineshort,
		inclinelong:state.inclinelong
	},"extra"));
}
function tradeItem(trade,price,state,wallet){
	let item = encode(common(trade,price,state),"trade");
	const wall = encode({
		fiat:wallet.fiat,
		coin:wallet.coin
	},"wallet");
	item = [...item,wall];
	return item;
}

function encode(data,type){
	let a = [];
	for(let i in keys[type]){
		const key = keys[type][i];
		let val = data[key];
		if(typeof val === "number" && key !== "timestamp" && type !== "wallet") val = val.toFiat();
		a.push(val);
	}
	return a;
}

function decode(data,type){
	let o = {};
	for(let i=0;i<keys[type].length;i++){
		const key = keys[type][i];
		o[key] = data[i];
	}
	return o;
}

const encoding = {
	tradeItem:tradeItem,
	getItems:getItems,
	encode:encode,
	decode:function(data){
		for(let key of Object.keys(data)){
			for(let i in data[key]){				
				data[key][i] = decode(data[key][i],key);
				for(let key2 of Object.keys(data[key][i])){
					if(typeof data[key][i][key2] === "object" && keys[key2]){
						data[key][i][key2] = decode(data[key][i][key2],key2);
					}
				}
			}
		}
		return data;
	}
};

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory);
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.tb_encoding = factory();
	}
}(typeof self !== "undefined" ? self : this, function () {
	return encoding;
}));


