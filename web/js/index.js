"use strict"

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
			let time = new Date(item.timestamp);
			Time.trade.push(time);
			plots.trade.y.push(item.price);
			plots.trend.y.push(item.trend);
			plots.average.y.push(item.average);
			plots.momentum.y.push(item.momentum);
			plots.resistance.y.push(item.resistance);
			plots.speed.y.push(item.speed.sell);
			plots.speed2.y.push(item.speed.buy);
			plots.speed3.y.push(item.speed.frenzy);
			plots.inertia.y.push(item.inertia);
			plots.orderv.y.push(item.orders);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	buysell:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		console.log(data);
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			Time[item.dir].push(time);

			plots.target.x.push(time);
			plots.target.y.push(item.target);	
			plots[item.dir].y.push(item.price);
			plots[item.dir+2].y.push(item.inertia);
			plots[item.dir+3].y.push(item.frenzy);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	}
	
}
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



const layers = Object.keys(plots).map((key)=>{
	return plots[key];
});
