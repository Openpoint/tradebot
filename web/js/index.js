"use strict"

import * as plot from './plots.js';
import * as tools from './tools.js';
const socket = io();
const myChart = echarts.init(document.getElementById('chart'));
let daterange = tools.getRange();
let Data;
let option;
let minprice;
let ready = false;


myChart.showLoading();

const Make = {
	trade:function(data,bulk){
		let lasttrade;	
		data.forEach((trade,i)=>{
			if(!trade.peaks) trade.peaks = {};
			if(!minprice || trade.price < minprice) minprice = trade.price;
			Data.price.price.push([trade.timestamp*1000,trade.price]);
			Data.price.average.push([trade.timestamp*1000,trade.average]);
			Data.price.target.push([trade.timestamp*1000,trade.target]);

			Data.sentiment.bullbear.push([trade.timestamp*1000,trade.sentiment]);
			Data.sentiment.peak.push([trade.timestamp*1000,trade.peaks.sentiment]);

			Data.inertia.inertia.push([trade.timestamp*1000,trade.inertia]);
			Data.inertia.peak.push([trade.timestamp*1000,trade.peaks.inertia]);

			Data.speed.speed.push([trade.timestamp*1000,trade.speed.speed]);
			Data.speed.peak.push([trade.timestamp*1000,trade.peaks.speed]);

			Data.orders.orders.push([trade.timestamp*1000,trade.orders]);
			Data.orders.peak.push([trade.timestamp*1000,trade.peaks.orders]);

			Data.incline.incline.push([trade.timestamp*1000,trade.speed.incline]);
			Data.incline.peak.push([trade.timestamp*1000,trade.peaks.incline]);

			Data.peaked.push([trade.timestamp*1000,trade.peaked<0?0:1]);
			if(i === data.length-1) lasttrade = trade.timestamp*1000;
		}) 
		option.dataZoom.startValue = lasttrade - tools.week;
		option.dataZoom.endValue = lasttrade;
		option.yAxis[0].min = minprice-100;		
	},
	buysell:function(data,bulk){		
		data.forEach((trade)=>{
			Data.price[trade.dir].push([trade.timestamp*1000,trade.price]);
			Data.sentiment[trade.dir].push([trade.timestamp*1000,trade.sentiment]);
			Data.inertia[trade.dir].push([trade.timestamp*1000,trade.inertia]);
			Data.speed[trade.dir].push([trade.timestamp*1000,trade.speed]);
			Data.orders[trade.dir].push([trade.timestamp*1000,trade.orders]);
			Data.incline[trade.dir].push([trade.timestamp*1000,trade.incline]);
		})		
	}
}


socket.on('connect',()=>{
	console.warn('connected');
	socket.emit('data',daterange)
})
socket.on('all',(data)=>{
	console.log(data)
	Data = new plot.getData();
	option = new plot.getOption(Data);
	if(ready) return;
	ready = true;
	Object.keys(data).forEach((key)=>{
		if(Make[key]) Make[key](data[key],true);
	})
	myChart.clear();	
	myChart.setOption(option);
	myChart.hideLoading();
})
let t_out;
window.onresize = function(event) {
	window.clearTimeout(t_out);
	t_out = window.setTimeout(()=>{
		myChart.resize();
	},10)
	
};
document.getElementById('prev').addEventListener('click',()=>{
	if(!ready) return;
	daterange = tools.getRange(-1);
	update();
})
document.getElementById('next').addEventListener('click',()=>{
	if(!ready) return;
	daterange = tools.getRange(1);
	update();
})
function update(){
	console.log(daterange)
	myChart.showLoading();
	ready = false;
	socket.emit('data',daterange)
}