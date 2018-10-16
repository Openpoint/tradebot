"use strict";

const keys = {
	trade:["timestamp","price","dir","trend","inertia","speed","incline","orders","target","triggered"],
	peaks:["inertia","speed","orders","incline","trend"],
	triggered:["glut","doldrum","peaks","good","total"],
	extra:["average","peaks","triggers","inclineshort","inclinelong"],
	triggers:["emergency","inertia","speed","orders","incline","profit","cliff","dataloss"]
};
keys.buysell = keys.trade;
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
function tradeItem(trade,price,state){
	return encode(common(trade,price,state),"trade");
}

function encode(data,type){
	let a = [];
	for(let i=0;i<keys[type].length;i++){
		const key = keys[type][i];
		let val = data[key];
		if(typeof val === "number" && key !== "timestamp") val = val.toFiat();
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
		const Keys = Object.keys(data);
		for(let i=0;i<Keys.length;i++){
			let key = Keys[i];
			for(let i2=0;i2<data[key].length;i2++){
				data[key][i2] = decode(data[key][i2],key);
				let keys2 = Object.keys(data[key][i2]);
				for(let i3=0;i3<keys2.length;i3++){
					const k3 = keys2[i3];
					if(typeof data[key][i2][k3] === "object" && keys[k3]){
						data[key][i2][k3] = decode(data[key][i2][k3],k3);
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
		root.encoding = factory();
	}
}(typeof self !== "undefined" ? self : this, function () {
	return encoding;
}));


