"use strict";

/* eslint-disable no-console */
import * as tools from "./tools.js";
import {printSale,resetSales} from "./sales.js";

let Data;
let minprice;
export let option;
let oldZoom;
let zto;
let newZoom;
let myChart;
let Series = {};

export function resetSeries(){
	Series = {};
}
export function init(z,chart){
	Data = {};
	tools.reset();
	resetSales();
	option = false;
	myChart = chart;
	newZoom = z;
	setData("data");
	setData();
}
export function getZoom(){
	return newZoom;
}
export function changeZoom(zoom){
	newZoom = zoom;
}
export function setZoom(){
	let zoom = myChart.getOption().dataZoom[0];
	let diff = Math.round((zoom.endValue - zoom.startValue));
	newZoom = tools.getZoom(diff);
	if(!oldZoom) oldZoom = newZoom;
	(oldZoom !== newZoom)?myChart.showLoading():myChart.hideLoading();
	clearTimeout(zto);
	zto = setTimeout(()=>{
		option = myChart.getOption();
		if(!Series[oldZoom]) Series[oldZoom] = option.series;
		if(oldZoom !== newZoom){
			if(!Series[newZoom]){
				new tools.Smooth(newZoom);
				setData();
				Make.Trade(tools.smooth[newZoom]);
				option.series = getOption().series;
			}else{
				option.series = Series[newZoom];
			}
			option.dataZoom[0].realtime = newZoom === "data"?false:true;
			myChart.setOption(option);
			myChart.hideLoading();

		}
		oldZoom = newZoom;
	},1000);
}
export const Make = {
	Trade:function(data,update){
		if(!data) return;
		const newOption = myChart.getOption();
		let lastTime;
		if(update && newOption){
			option = newOption;
			const last = Data[update].price.price.length-1;
			if(last >= 0) lastTime = Data[update].price.price[last][0];
		}
		let lasttrade;
		let firsttrade;
		
		for(let i=0;i<data.length;i++){
			const trade = data[i];
			if(!lastTime || trade.timestamp > lastTime){
				if(!trade.peaks) trade.peaks = {};
				if(!minprice || trade.price < minprice) minprice = trade.price;
				Data[update||newZoom].price.price.push([trade.timestamp,trade.price]);
				Data[update||newZoom].price.average.push([trade.timestamp,trade.average]);
				Data[update||newZoom].price.target.push([trade.timestamp,trade.target]);
				Data[update||newZoom].price.peak.push([trade.timestamp,trade.peaks.price]);
	
				Data[update||newZoom].trend.trend.push([trade.timestamp,trade.trend]);
				Data[update||newZoom].trend.peak.push([trade.timestamp,trade.peaks.trend]);
				Data[update||newZoom].trend.doldrum.push([trade.timestamp,trade.triggered.doldrum]);
	
				Data[update||newZoom].inertia.inertia.push([trade.timestamp,trade.inertia]);
				Data[update||newZoom].inertia.peak.push([trade.timestamp,trade.peaks.inertia]);
	
				Data[update||newZoom].speed.speed.push([trade.timestamp,trade.speed]);
				Data[update||newZoom].speed.peak.push([trade.timestamp,trade.peaks.speed]);
	
				Data[update||newZoom].orders.orders.push([trade.timestamp,trade.orders]);
				Data[update||newZoom].orders.peak.push([trade.timestamp,trade.peaks.orders]);
	
				Data[update||newZoom].incline.incline.push([trade.timestamp,trade.incline]);
				Data[update||newZoom].incline.short.push([trade.timestamp,trade.inclineshort]);
				Data[update||newZoom].incline.long.push([trade.timestamp,trade.inclinelong]);
				Data[update||newZoom].incline.peak.push([trade.timestamp,trade.peaks.incline]);
	
				Data[update||newZoom].peaked.peak.push([trade.timestamp,trade.triggered.peaks,trade.triggers]);
				Data[update||newZoom].peaked.good.push([trade.timestamp,trade.triggered.good]);
				Data[update||newZoom].peaked.total.push([trade.timestamp,trade.triggered.total]);
				Data[update||newZoom].peaked.glut.push([trade.timestamp,-trade.triggered.glut]);
				
				if(!update){
					if(i === data.length-1) lasttrade = trade.timestamp;
					if(i === 0) firsttrade = trade.timestamp;
				}
			}
		}
		if(!update){
			if(!option.dataZoom.startValue) option.dataZoom.startValue = firsttrade;
			if(!option.dataZoom.endValue) option.dataZoom.endValue = lasttrade;
		}
		option.yAxis[0].min = minprice-100;
	},
	buysell:function(data,update){
		if(!data) return;
		for(let trade of data){
			Data[update||newZoom].price[trade.dir].push([trade.timestamp,trade.price]);
			Data[update||newZoom].trend[trade.dir].push([trade.timestamp,trade.trend]);
			Data[update||newZoom].inertia[trade.dir].push([trade.timestamp,trade.inertia]);
			Data[update||newZoom].speed[trade.dir].push([trade.timestamp,trade.speed]);
			Data[update||newZoom].orders[trade.dir].push([trade.timestamp,trade.orders]);
			Data[update||newZoom].incline[trade.dir].push([trade.timestamp,trade.incline]);
			Data[update||newZoom].peaked[trade.dir].push([trade.timestamp,trade.triggered.total]);

			if(!update) printSale(trade);
		}
	}
};

export function getOption() {
	const o = {
		grid: [
			new grid("18%","4%"),
			new grid("10%","23.5%"),
			new grid("10%","35%"),
			new grid("10%","46.5%"),
			new grid("10%","58%"),
			new grid("10%","69.5%"),
			new grid("10%","81%")
		],
		xAxis: [
			new xaxis(),
			new xaxis(1),
			new xaxis(2),
			new xaxis(3),
			new xaxis(4),
			new xaxis(5),
			new xaxis(6,true),
		],
		yAxis: [
			new yaxis("Price"),
			new yaxis("Triggers",1),
			new yaxis("Trend",2),
			new yaxis("Inertia",3),
			new yaxis("Speed",4),
			new yaxis("Orders",5),
			new yaxis("incline",6)
		],
		series: [
			new series({name:"Price",type:"line",data:Data[newZoom].price.price,color:"black",width:1.5}),
			new series({name:"Average",type:"line",data:Data[newZoom].price.average,color:"dodgerblue",width:0.5}),
			new series({name:"Target",type:"line",data:Data[newZoom].price.target,color:"rgba(0,0,0,.3)",style:"dots",width:1,fill:true,step:"middle"}),
			new series({name:"Peak",type:"line",data:Data[newZoom].price.peak,color:"dodgerblue",style:"dots",width:1,step:"middle"}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].price.buy,color:"lime"}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].price.sell,color:"red"}),

			new series({name:"Peaked",type:"line",data:Data[newZoom].peaked.peak,color:"red",fill:true,index:1,width:0.5,step:"middle"}),
			new series({name:"Good",type:"line",data:Data[newZoom].peaked.good,color:"blue",fill:true,index:1,width:0.5,step:"middle"}),
			new series({name:"Total",type:"line",data:Data[newZoom].peaked.total,color:"black",index:1,step:"middle",width:1}),
			new series({name:"Glut",type:"line",data:Data[newZoom].peaked.glut,color:"dodgerblue",index:1,width:1,fill:true,step:"middle"}),
			
			new series({name:"Buy",type:"scatter",data:Data[newZoom].peaked.buy,color:"lime",index:1}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].peaked.sell,color:"red",index:1}),
			//new series({name:"Data",type:"custom",data:Data[newZoom].triggers,index:1}),

			new series({name:"Trend",type:"line",data:Data[newZoom].trend.trend,color:"dodgerblue",width:1,index:2,fill:true}),
			new series({name:"Doldrum",type:"line",data:Data[newZoom].trend.doldrum,color:"orange",index:2,width:1}),
			new series({name:"Peak",type:"line",data:Data[newZoom].trend.peak,color:"dodgerblue",index:2,width:0.5,step:"middle"}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].trend.buy,color:"lime",index:2}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].trend.sell,color:"red",index:2}),

			new series({name:"Inertia",type:"line",data:Data[newZoom].inertia.inertia,color:"darkorange",fill:true,index:3}),
			new series({name:"Peak",type:"line",data:Data[newZoom].inertia.peak,color:"black",index:3,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].inertia.buy,color:"lime",index:3}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].inertia.sell,color:"red",index:3}),

			new series({name:"Speed",type:"line",data:Data[newZoom].speed.speed,color:"SeaGreen",fill:true,index:4}),
			new series({name:"Peak",type:"line",data:Data[newZoom].speed.peak,color:"black",index:4,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].speed.buy,color:"lime",index:4}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].speed.sell,color:"red",index:4}),

			new series({name:"Orders",type:"line",data:Data[newZoom].orders.orders,color:"violet",fill:true,index:5}),
			new series({name:"Peak",type:"line",data:Data[newZoom].orders.peak,color:"black",index:5,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].orders.buy,color:"lime",index:5}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].orders.sell,color:"red",index:5}),

			new series({name:"Incline",type:"line",data:Data[newZoom].incline.incline,color:"blue",index:6}),
			new series({name:"Peak",type:"line",data:Data[newZoom].incline.peak,color:"blue",index:6,style:"dots",width:1}),
			new series({name:"short",type:"line",data:Data[newZoom].incline.short,color:"red",index:6}),
			new series({name:"long",type:"line",data:Data[newZoom].incline.long,color:"green",fill:true,index:6}),
			new series({name:"Buy",type:"scatter",data:Data[newZoom].incline.buy,color:"lime",index:6}),
			new series({name:"Sell",type:"scatter",data:Data[newZoom].incline.sell,color:"red",index:6}),


		],
		tooltip: {
			trigger: "axis",
			axisPointer: {
				type: "cross"
			},
			formatter: function (params) {
				return formatter(params);
			}
		},
		toolbox: {
			feature: {
				dataZoom: {
					yAxisIndex: "none"
				},
				saveAsImage: {}
			}
		},
		axisPointer: {
			link: {
				xAxisIndex: "all"
			}
		},
		dataZoom: {
			realtime: true,
			filterMode: "filter",
			xAxisIndex: [0, 1, 2, 3, 4, 5, 6],
			animation:false
		}
	};
	if(!option) option = o;
	return o;
}

const row = ["inertia","speed","orders","incline","trend"];
const row2 = ["Peaked","Good","Glut","Doldrum","Total"];
function formatter(params){
	let index;
	let string = "<div class='tooltip'>";
	if (typeof params.length === "number") {
		for(let i=0;i<params.length;i++){
			const p = params[i];
			if ((p.axisIndex === index + 1)) string += "</div>";
			if (p.axisIndex !== index) {
				string += (
					"<div class='section s" + p.axisIndex + "'><div class='heading'>" +
					(p.seriesName ==="Peaked"?"Triggers":p.seriesName) +
					"</div>");
			}
			if (p.data[2]) {
				let newstring = "";
				let newstring2 = "";
				const keys = Object.keys(p.data[2]);
				for(let i=0;i<keys.length;i++){
					const k = keys[i];
					if(row.indexOf(k) > -1){
						newstring += "<div class='dataitem triggers'>"+k + ":<span>" + p.data[2][k] + " </span></div>";
					}else{
						newstring2 += "<div class='dataitem'>"+k + ":<span>" + p.data[2][k] + " </span></div>";
					}
				}
				string += newstring + "<div class='spacer'></div>";
				string += newstring2 +"<div class='spacer'></div>";
				//if (i === params.length - 1) string += "</div>";

			}
			let C = row2.indexOf(p.seriesName) > -1?" peaked":"";
			string += ("<div class='dataitem"+C+"'>" + p.seriesName + ": <span>" + p.data[1] + "</span></div>");
			if (i === params.length - 1) string += "</div>";
			index = p.axisIndex; 
		}
	} else {
		string += ("<div class='section'>" + params.marker + params.seriesName + ": " + params.data[1] + "</div>");
	}

	string += "</div>";
	return string;
}

function grid(height, top) {
	return {
		left: 90,
		right: 30,
		height: height,
		top: top,
	};
}
function xaxis(index, show) {
	let x = {
		type: "time",
		position: "bottom",

		silent: true,
		axisLabel: {
			show: show || false,
		},
		axisPointer: {
			label: {
				show: show || false
			}
		},
	};
	if (index) x.gridIndex = index;
	return x;
}
function yaxis(name, index, hide) {
	let y = {
		name: name,
		type: "value",
		nameLocation: "middle",
		nameRotate: 90,
		nameGap: 65,
		show: hide ? false : true,
		splitLine: {
			lineStyle: {
				opacity: 0.5
			}
		},
		nameTextStyle: {
			fontWeight: "bold"
		}
	};
	if (index) y.gridIndex = index;
	return y;
}
function series(i) {
	let s = {
		name: i.name,
		type: i.type,
		hoverAnimation: false,
		animation: false,
		data: i.data,
	};
	if (i.index) {
		s.xAxisIndex = i.index;
		s.yAxisIndex = i.index;
	}
	if (i.type === "line") {
		s.showSymbol = false;
		s.lineStyle = {
			normal: {
				color: i.color,
				width: i.width || 1,
				type: i.style || "solid"
			}
		};
		if (i.step) s.step = i.step;
		if (i.fill) s.areaStyle = {
			color: i.color,
			opacity: 0.2
		};
	} else if(i.type === "custom"){
		s.renderItem = function() {
			return echarts.graphic.text;
		};
	}else if(i.type === "scatter"){
		s.symbolSize = (i.name === "Buy price" || i.name === "Sell price") ? 20 : 10;
		s.tooltip = {
			trigger: "item"
		};
		s.itemStyle = {
			normal: {
				color: i.color,
				opacity: 0.5
			}
		};
	}
	return s;
}

export function setData(level) {
	Data[level||newZoom] = {
		price:{
			price: [],
			buy:(Data[newZoom]?Data[newZoom].price.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].price.sell:[]),
			average:[],
			target:[],
			peak:[]
		},
		inertia:{
			inertia:[],
			buy:(Data[newZoom]?Data[newZoom].inertia.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].inertia.sell:[]),
			peak:[]
		},
		trend:{
			trend:[],
			doldrum:[],
			peak:[],
			buy:(Data[newZoom]?Data[newZoom].trend.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].trend.sell:[])
		},
		speed:{
			speed:[],
			buy:(Data[newZoom]?Data[newZoom].speed.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].speed.sell:[]),
			peak:[]
		},
		orders: {
			orders: [],
			buy:(Data[newZoom]?Data[newZoom].orders.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].orders.sell:[]),
			peak: []
		},
		incline: {
			incline: [],
			short:[],
			long:[],
			buy:(Data[newZoom]?Data[newZoom].incline.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].incline.sell:[]),
			peak: []
		},
		peaked:{
			peak:[],
			good:[],
			total:[],
			glut:[],
			buy:(Data[newZoom]?Data[newZoom].peaked.buy:[]),
			sell:(Data[newZoom]?Data[newZoom].peaked.sell:[]),
		}
	};
}