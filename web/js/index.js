"use strict";

/* eslint-disable no-console */

import * as plot from "./plots.js";
import * as tools from "./tools.js";

const {decode} = tb_encoding;
const socket = io();
const myChart = echarts.init(document.getElementById("chart"));
let daterange;
let ready = false;

myChart.showLoading();
myChart.on("datazoom",()=>{
	plot.setZoom(myChart);
});


socket.on("connect",()=>{
	if(!ready) socket.emit("data",daterange);
});
socket.on("all",(data)=>{
	if(ready) return;
	ready = true;
	console.log(data)
	data = decode(data);
	let diff = (data.Trade[data.Trade.length-1].timestamp - data.Trade[0].timestamp);
	plot.init(tools.getZoom(diff));

	new tools.Smooth(plot.initzoom,data.Trade);
	let option = plot.getOption();
	plot.Make.Trade(tools.smooth[plot.initzoom]);
	
	plot.Make.buysell(data.buysell);	
	myChart.setOption(option);
	myChart.hideLoading();
});
let t_out;
window.onresize = function() {
	window.clearTimeout(t_out);
	t_out = window.setTimeout(()=>{
		myChart.resize();
	},10);
	
};
document.getElementById("dotrade").addEventListener("click",()=>{
	if(!ready) return;
	socket.emit("dotrade",true);	
});
/*
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
