"use strict";

global.__rootdir = __dirname;
global.state = {
	trade_dir:'sell',
	trade_inertia:0,
	order_inertia:0,
	loading:true
}

const File = require('./lib/files.js');
if(!File.ready) return;
const History = require('./recorder/getter.js');
const Bitstamp = require('./lib/bitstamp_data.js');
const Calc = require('./lib/calc.js');

const startup_price = [];
let coin = 1;
let fiat = 0;
let first_trade = false;
let prev_inertia = 0;
let peak_inertia = 0;
let last_price;
let active_price;
let Buffer = [];

const io = require('./lib/graphserver.js');

Bitstamp.channels.trades.bind('trade', function (data) {
	if(state.loading){
		data._T = 'trades';
		Buffer.push(data);
	}else{
		addTrade(data);
	}
})

Bitstamp.channels.orders.bind('data', function (data) {
	if(state.loading){
		data._T = 'orders';
		Buffer.push(data);
	}else{
		addOrder(data);
	}
})



function checkProfit(dir,trade){
	//const inertia_bias = dir === 'sell'?4:2;
	const inertia_bias = 2;
	let fee;
	let bid;

	//if(!last_price && trade.average_inertia <= 0) return false;
	bid = Calc.bid(last_price);

	console.log(
		'check '+dir+' profit:',
		'peak_i:'+peak_inertia/inertia_bias,
		'trade_i:'+state.trade_inertia,
		'ap:'+active_price,
		'lp:'+last_price,
		'bid:'+bid,
		dir==='sell'?peak_inertia/inertia_bias > state.trade_inertia:peak_inertia/inertia_bias < state.trade_inertia,
		dir==='sell'?!bid||active_price > bid:active_price < bid
	);
	const item = {
		timestamp:trade.timestamp*1000,
		resistance:peak_inertia/inertia_bias,
		target:bid
	}
	if(!state.loading) io.emit('resistance',item);
	File.write('resistance',item);
	if(dir === 'sell' && peak_inertia/inertia_bias > state.trade_inertia && (!bid||active_price > bid)) return true;
	if(dir === 'buy' && peak_inertia/inertia_bias < state.trade_inertia && active_price < bid) return true;
	return false;
}
function doTrade(trade){

	const Trade = trade;
	state.trade_dir === "sell"?sell(Trade):buy(Trade);
}
function buy(trade){

	const profitable = checkProfit('buy',trade);
	if(!profitable) return;
	first_trade = true;
	console.log('BUY');
	console.log(trade.price);
	console.log(trade);

	last_price = trade.price;

	fiat = fiat - Calc.fee(fiat);
	coin = fiat/trade.price;
	fiat = 0;
	console.log('$'+fiat,'BTC:'+coin);
	const item = {
		timestamp:trade.timestamp*1000,
		price:trade.price,
		volume:trade.amount,
		target:Calc.bid(trade.price)
	}
	if(!state.loading) io.emit('buy',item);
	File.write('buy',item);
	state.trade_dir = "sell";

}
function sell(trade){

	const profitable = checkProfit('sell',trade);
	if(!profitable) return;
	first_trade = true;
	console.log('SELL');
	console.log(trade.price);
	console.log(trade)

	last_price = trade.price;
	fiat = trade.price * coin;
	fiat = fiat - Calc.fee(fiat);
	coin = 0;
	console.log('$'+fiat,'BTC:'+coin);
	const item = {
		timestamp:trade.timestamp*1000,
		price:trade.price,
		volume:trade.amount,
		target:Calc.bid(trade.price)
	}
	if(!state.loading) io.emit('sell',item);
	File.write('sell',item);
	state.trade_dir = "buy";
}
function addOrder(data){
	Calc.order(data);
}

function addTrade(trade){

	active_price = trade.price;

	Calc.inertia(trade);

	if(!first_trade){
		startup_price.push(trade.price);
		last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
		console.log("startup price:"+last_price)
	}

	if((prev_inertia > 0 && state.trade_inertia < 0)||(prev_inertia < 0 && state.trade_inertia > 0)){
		console.log('-------------------SWING----------------------------');
	}
	prev_inertia = state.trade_inertia;

	console.log(trade.price+' : '+state.trade_inertia);
	let item = {
		timestamp:trade.timestamp*1000,
		price:trade.price,
		inertia:state.trade_inertia
	}
	if(!state.loading) io.emit('trade',item);
	File.write('trade',item);
	item = {
		timestamp:trade.timestamp*1000,
		volume:state.order_inertia.vol,
		price:state.order_inertia.price,
		weight:state.order_inertia.weight
	}
	if(!state.loading) io.emit('orders',item);
	File.write('orders',item);

	if(state.trade_dir === 'sell' && state.trade_inertia > peak_inertia) peak_inertia = state.trade_inertia;
	if(state.trade_dir === 'buy' && state.trade_inertia < peak_inertia) peak_inertia = state.trade_inertia;
	if((state.trade_dir === 'sell' && state.trade_inertia > 0)||(state.trade_dir === 'buy' && state.trade_inertia < 0)) doTrade(trade);
}

History.get(null,addTrade).then(()=>{
	Buffer.forEach((item)=>{
		item._T === 'trades'?addTrade(item):addOrder(item);
	})
	io.emit('all',io.getData());
	state.loading = false;
	console.log('_____________Done restoring data__________________')
});



