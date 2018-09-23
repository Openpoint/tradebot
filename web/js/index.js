"use strict"
const daterange = {start:'20180821',end:'20180930'};
//const daterange = {start:'20180718',end:'20180818'};
const chart = document.getElementById('chart');
const socket = io();
let ready = false;

import {plots,layout,Time} from './plots.js'; 
const range=[0,0]
function Range(n){
	if(n > range[1]) range[1] = n;
	if(n < range[0]) range[0] = n;
}
const Make = {
	trade:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		data.forEach((item)=>{
			if(!item.peaks) item.peaks = {};
			let time = new Date(item.timestamp*1000);
			
			Time.trade.push(time);
			plots.price.trade.y.push(item.price);
			plots.price.average.y.push(item.average);
			plots.price.target.y.push(item.target);

			
			//plots.speed.sellspeed.y.push(item.speed.sell);
			//plots.speed.buyspeed.y.push(item.speed.buy);
			plots.speed.incline.y.push(item.speed.incline);
			plots.speed.frenzy.y.push(item.speed.frenzy);
			plots.speed.peak.y.push(item.peaks.frenzy);
			plots.speed.peaki.y.push(item.peaks.incline);
			
			plots.market.inertia.y.push(item.inertia);
			plots.market.peak.y.push(item.peaks.inertia);
			plots.market.adjusted.y.push(item.bull_bear);

			//plots.sentiment.momentum.y.push(item.momentum);
			plots.sentiment.bull_bear.y.push(item.bull_bear);
			plots.sentiment.peak.y.push(item.peaks.bull_bear);
			//plots.sentiment.orders.y.push(item.orders);

			plots.orders.weight.y.push(item.orders);
			plots.orders.peak.y.push(item.peaks.orders);
			plots.orders.peaked.y.push(item.peaked);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	buysell:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		data.forEach((item)=>{
			let time = new Date(item.timestamp*1000);
			Time[item.dir].push(time);
			Time.buysell.push(time);

			//plots.price.target.y.push(item.target);	
			plots.price[item.dir].y.push(item.price);
			plots.market[item.dir].y.push(item.inertia);
			plots.speed[item.dir].y.push(item.frenzy);
			plots.sentiment[item.dir].y.push(item.bull_bear);
			plots.orders[item.dir].y.push(item.orders);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	}
	
}
socket.on('connect',()=>{
	console.warn('connected');
	socket.emit('data',daterange)
})
socket.on('all',(data)=>{
	if(ready) return;
	ready = true;
	console.log(data);
	Object.keys(data).forEach((key)=>{
		if(Make[key]) Make[key](data[key],true);
	})

	Plotly.newPlot(chart,layers,layout);
})
Object.keys(Make).forEach((key)=>{
	socket.on(key,(data)=>{
		console.error(key);
		layout.datarevision++;
		Make[key](data);
	})	
})



const layers = [];
Object.keys(plots).forEach((key)=>{
	Object.keys(plots[key]).forEach((key2)=>{
		layers.push(plots[key][key2]);
	});
});
