"use strict";

const expense = 0.25;
const order_book = [];
const inertias = [];
const smoothing = {
	trade:100,
	order:1
}

const fee = exports.fee = function(val){
	return val*(expense/100);
}

const bid = exports.bid = function(val){
	if (state.trade_dir === 'sell'){
		val += fee(val);
		val += fee(val);
	}else{
		val -= fee(val);
		val -= fee(val);
	}
	return val;
}

const inertia = exports.inertia = function(trade){
	let inertia = trade.price*trade.amount;
	inertia = trade.type?inertia*-1:inertia;
	inertias.push(inertia);
	
	inertia = inertias.reduce((a, b) => a + b, 0)/inertias.length;
	if(inertias.length >= smoothing.trade) inertias.shift();
	state.trade_inertia = Math.round(inertia);	
}
function flatten(data,dir){
	let len = data.length;
	let foo = {vol:0,price:0,weight:0};
	data.forEach((b)=>{
		let v = b[1]*1;
		let p = b[0]*1;
		foo.vol+=v;
		foo.price+=p;
		foo.weight = p*v;
	})
	Object.keys(foo).forEach((k)=>{
		foo[k] = Math.round(foo[k]/len);
	})
	foo.dir = dir;
	return foo;
	
}
const order = exports.order = function(data,flat){
	if(!flat) state.order_bids = flatten(data.bids,'bids');
	if(!flat) state.order_asks = flatten(data.asks,'asks');
	const average = {vol:0,price:0,weight:0};
	order_book.push({
		bids:Object.assign({},state.order_bids),
		asks:Object.assign({},state.order_asks)
	});
	order_book.forEach((g)=>{
		Object.keys(average).forEach((k)=>{
			average[k]+=g.asks[k];
			average[k]-=g.bids[k];
		})
	})
	if(order_book.length >= smoothing.order) order_book.shift();
	state.order_inertia = average;
	//return average;
}