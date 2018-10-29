"use strict";

/* eslint-disable no-console */

import * as plot from "./plots.js";
import * as tools from "./tools.js";
import {printSale} from "./sales.js";

const {decode} = tb_encoding;
const {web} = tb_time;
const socket = io();
const myChart = echarts.init(document.getElementById("chart"));
let ready = false;
let init = false;
let inputStart = document.querySelector("#datePicker .start");
let inputEnd = document.querySelector("#datePicker .end");

inputStart.onblur = changeDate;
inputEnd.onblur = changeDate;
function changeDate(){
	if(!init || !this.value || !this.checkValidity()){
		web.resetRange();
		return;
	}
	web.changeRange(this);
	if(web.changed){
		myChart.showLoading();
		ready = false;
		socket.emit("data",web.dateRange);
	}
}

myChart.showLoading();
myChart.on("datazoom",()=>{
	plot.setZoom();
});


socket.on("connect",()=>{
	socket.emit("getDate");
});
socket.on("gotDate",(range)=>{
	console.log(range);
	web.setRange(range);
	web.setInputs(inputStart,inputEnd);
	if(!ready) socket.emit("data",web.dateRange);
});
socket.on("all",(data)=>{
	console.log(data);
	if(ready) return;
	data = decode(data);
	let zoom;
	if(data.Trade.length > 1){
		let diff = (data.Trade[data.Trade.length-1].timestamp - data.Trade[0].timestamp);
		zoom = tools.getZoom(diff);
	}else{
		zoom = "data";
	}
	plot.init(zoom,myChart);
	tools.smooth.data = data.Trade;
	new tools.Smooth(zoom,data.Trade);
	let option = plot.getOption();

	plot.Make.Trade(tools.smooth[zoom]);
	plot.Make.buysell(data.buysell);
	if(zoom !== "data") plot.Make.Trade(data.Trade,"data");
	if(zoom !== "data") plot.Make.buysell(data.buysell,"data");

	myChart.setOption(option);
	myChart.hideLoading();
	setTimeout(function(){
		init = true;
		ready = true;
	},1000);
	
});

let buffer = {};
socket.on("update",(data)=>{
	for (let key of Object.keys(data)){
		if(!buffer[key]) buffer[key] = [];
		buffer[key] = buffer[key].concat(data[key]);
	}
	if(!ready)return;	
	goBuffer();
});

function goBuffer(){
	ready = false;
	buffer = decode(buffer);
	web.updateRange(buffer);
	
	let option = myChart.getOption();
	let diff = (option.dataZoom[0].endValue - option.dataZoom[0].startValue);
	let zoom = tools.getZoom(diff);

	if(buffer.Trade){
		plot.resetSeries();
		tools.smooth.data = tools.smooth.data.concat(buffer.Trade);
		let skip;
		if(!tools.smooth[zoom]){
			skip = zoom;
			plot.setData(zoom);
			new tools.Smooth(zoom,tools.smooth.data);
			plot.Make.Trade(tools.smooth[zoom],zoom);
		}
		for(let level of Object.keys(tools.smooth)){
			if(level !== skip){
				if(level !== "data") new tools.updateSmooth(level,buffer.Trade);
				let newData = [];
				let i = tools.smooth[level].length-1;
				while (typeof i === "number" && i >= 0){
					if(tools.smooth[level][i].timestamp >= buffer.Trade[0].timestamp){
						newData.unshift(tools.smooth[level][i]);
					}else{
						i = false;
					}
					i --;
				}
				plot.Make.Trade(newData,level);
			}
		}
	}
	if(buffer.buysell){
		for(let level of Object.keys(tools.smooth)){
			plot.Make.buysell(buffer.buysell,level);
		}
		for(let trade of buffer.buysell){
			printSale(trade);
		}
	}
	plot.changeZoom(zoom);
	option.series = plot.getOption().series;
	option.yAxis[0].min = plot.option.yAxis[0].min;
	myChart.setOption(option);
	buffer = {};
	setTimeout(function(){
		ready = true;
		if(Object.keys(buffer).length) goBuffer();
	},500);
}
let t_out;
window.onresize = function() {
	window.clearTimeout(t_out);
	t_out = window.setTimeout(()=>{
		myChart.resize();
	},10);
};



/*
document.getElementById("dotrade").addEventListener("click",()=>{
	if(!ready) return;
	socket.emit("dotrade",true);
});

document.getElementById("prev").addEventListener("click",()=>{
	if(!ready) return;
	daterange = tools.getRange(-1);
	update();
});
document.getElementById("next").addEventListener("click",()=>{
	if(!ready) return;
	daterange = tools.getRange(1);
	update();
});

function update(){
	console.log(daterange);
	myChart.showLoading();
	ready = false;
	socket.emit("data",daterange);
}
*/
