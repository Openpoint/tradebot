"use strict";

const child = require('child_process');
const G = require('./lib/globals.js');
global.__rootdir = __dirname;
Object.keys(G.globals).forEach((k)=>{global[k] = G.globals[k]});
const File = require('./lib/files.js');
if(!File.ready) return;
const Bitstamp = require('./lib/bitstamp_data.js');
const Calc = require('./lib/calc.js');
global.web = new require('./lib/graphserver.js').web();
const predict = require('./lib/predict.js');
const calc = require('./lib/calc.js');

let Buffer = [];

Bitstamp.channels.trades.bind('trade', function (data) {
	if(state.loading){
		data._T = 'trades';
		Buffer.push(data);
	}else{
		predict.addTrade(data);
	}
})

Bitstamp.channels.orders.bind('data', function (data) {
	if(state.loading){
		data._T = 'orders';
		Buffer.push(data);
	}else{
		Calc.order(data);
	}
})

state.loading = true;
const getter = child.spawn('node',['recorder/getter.js']);
let rates = [];
getter.stderr.on('data', (data) => {
	data = data.toString();
	console.log(data);
})
getter.stdout.on('data', (data) => {
	data = data.toString();
	if(data.startsWith('rates')){
		data = data.split('\n');
		rates.push(JSON.parse(data[1]));
		return;
	}
	if(data.startsWith('alldone')){
		data = data.split('\n');		
		state = JSON.parse(data[1]);
		calc.setBuffer(rates);
		rates = null;
		for (var i = 0, len = Buffer.length; i < len; i++) {
			let item = Buffer[i];
			item._T === 'trades'?predict.addTrade(item):Calc.order(item);
		}
		Buffer = null;
		web.getData().then((data2)=>{
			web.emit('all',data2);
		})
		state.loading = false;
		console.log('_______________FINISHED RESTORATION_________________________________')
		return;
	}
	console.log(data);
});


