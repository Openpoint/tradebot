"use strict";

const keyTypes = {
	trade:["timestamp","price","dir","trend","inertia","speed","incline","orders","target","triggered"],
	extra:["average","peaks","triggers","inclineshort","inclinelong"],
	peaks:["inertia","speed","orders","incline","trend","price"],
	triggered:["glut","doldrum","peaks","good","total"],	
	triggers:["emergency","inertia","speed","orders","incline","profit","cliff","dataloss"],
	wallet:["fiat","coin"]
};
keyTypes.buysell = [...keyTypes.trade,"wallet"];
keyTypes.Trade = keyTypes.trade.concat(keyTypes.extra);

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
	for(let i in keyTypes[type]){
		const key = keyTypes[type][i];
		let val = data[key];
		if(typeof val === "number" && key !== "timestamp" && type !== "wallet") val = val.toFiat();
		a.push(val);
	}
	return a;
}

function decode(data,type){
	let o = {};
	for(let i=0;i<keyTypes[type].length;i++){
		const key = keyTypes[type][i];
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
				for(let type of Object.keys(data[key][i])){
					if(typeof data[key][i][type] === "object" && keyTypes[type]){
						data[key][i][type] = decode(data[key][i][type],type);
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


