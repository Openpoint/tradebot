"use strict";

/* eslint-disable no-console */
import * as tools from "./tools.js";
let Data;
let minprice;
let option;
let oldZoom;
let zto;
let Series = {};
export let initzoom;
export function init(z){
	console.log(z);
	initzoom = z;
}
export function setZoom(myChart){
	let zoom = myChart.getOption().dataZoom[0];
	let diff = Math.round((zoom.endValue - zoom.startValue));
	let newZoom = tools.getZoom(diff);
	if(!oldZoom) oldZoom = initzoom;
	console.log(newZoom);
	(oldZoom !== newZoom)?myChart.showLoading():myChart.hideLoading();
	clearTimeout(zto);
	zto = setTimeout(()=>{
		option = myChart.getOption();
		if(!Series[oldZoom]) Series[oldZoom] = option.series;
		if(oldZoom !== newZoom){
			if(!Series[newZoom]){
				new tools.Smooth(newZoom);
				setData();
				Make.trade(tools.smooth[newZoom]);			
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
	trade:function(data){
		if(!data) return;
		let lasttrade;
		let firsttrade;	
		data.forEach((trade,i)=>{
			
			if(!trade.peaks) trade.peaks = {};
			if(!minprice || trade.price < minprice) minprice = trade.price;
			Data.price.price.push([trade.timestamp,trade.price]);
			Data.price.average.push([trade.timestamp,trade.average]);
			Data.price.target.push([trade.timestamp,trade.target]);

			Data.trend.trend.push([trade.timestamp,trade.trend]);
			Data.trend.peak.push([trade.timestamp,trade.peaks.trend]);

			Data.inertia.inertia.push([trade.timestamp,trade.inertia]);
			Data.inertia.peak.push([trade.timestamp,trade.peaks.inertia]);

			Data.speed.speed.push([trade.timestamp,trade.speed]);
			Data.speed.peak.push([trade.timestamp,trade.peaks.speed]);

			Data.orders.orders.push([trade.timestamp,trade.orders]);
			Data.orders.peak.push([trade.timestamp,trade.peaks.orders]);

			Data.incline.short.push([trade.timestamp,trade.inclineshort]);
			Data.incline.peakshort.push([trade.timestamp,trade.peaks.inclineshort]);
			Data.incline.long.push([trade.timestamp,trade.inclinelong]);
			Data.incline.peaklong.push([trade.timestamp,trade.peaks.inclinelong]);

			Data.peaked.peak.push([trade.timestamp,trade.triggered.peaked,trade.triggers]);
			Data.peaked.good.push([trade.timestamp,trade.triggered.good]);
			Data.peaked.total.push([trade.timestamp,trade.triggered.total]);
			//Data.peaked.total.push([trade.timestamp,trade.peaked.peak+trade.peaked.good]);
			Data.peaked.glut.push([trade.timestamp,-trade.triggered.glut]);
			Data.peaked.doldrum.push([trade.timestamp,-trade.triggered.doldrum]);

			//Data.triggers.push([trade.timestamp,0,trade.triggers]);

			if(i === data.length-1) lasttrade = trade.timestamp;
			if(i === 0) firsttrade = trade.timestamp;
		}); 
		if(!option.dataZoom.startValue) option.dataZoom.startValue = firsttrade;
		if(!option.dataZoom.endValue) option.dataZoom.endValue = lasttrade;
		option.yAxis[0].min = minprice-100;		
	},
	buysell:function(data){
		if(!data) return;		
		data.forEach((trade)=>{
			Data.price[trade.dir].push([trade.timestamp,trade.price]);
			Data.trend[trade.dir].push([trade.timestamp,trade.trend]);
			Data.inertia[trade.dir].push([trade.timestamp,trade.inertia]);
			Data.speed[trade.dir].push([trade.timestamp,trade.speed]);
			Data.orders[trade.dir].push([trade.timestamp,trade.orders]);
			Data.incline[trade.dir].push([trade.timestamp,trade.inclinelong]);
			Data.peaked[trade.dir].push([trade.timestamp,trade.triggered.total]);
		});		
	}
};

export function getOption() {
	if(!Data) setData();
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
			new series({name:"Price",type:"line",data:Data.price.price,color:"black",width:1.5}),
			new series({name:"Average",type:"line",data:Data.price.average,color:"dodgerblue",width:0.5}),
			new series({name:"Target",type:"line",data:Data.price.target,color:"rgba(0,0,0,.3)",style:"dots",width:1,fill:true,step:"end"}),
			new series({name:"Buy",type:"scatter",data:Data.price.buy,color:"lime"}),
			new series({name:"Sell",type:"scatter",data:Data.price.sell,color:"red"}),

			new series({name:"Peaked",type:"line",data:Data.peaked.peak,color:"red",fill:true,index:1,width:0.5,step:"middle"}),
			new series({name:"Good",type:"line",data:Data.peaked.good,color:"blue",fill:true,index:1,width:0.5,step:"middle"}),
			new series({name:"Total",type:"line",data:Data.peaked.total,color:"black",index:1,step:"middle",width:1}),
			new series({name:"Glut",type:"line",data:Data.peaked.glut,color:"dodgerblue",index:1,width:1,fill:true,step:"middle"}),
			new series({name:"Doldrum",type:"line",data:Data.peaked.doldrum,color:"orange",index:1,width:1,fill:true,step:"middle"}),
			new series({name:"Buy",type:"scatter",data:Data.peaked.buy,color:"lime",index:1}),
			new series({name:"Sell",type:"scatter",data:Data.peaked.sell,color:"red",index:1}),
			//new series({name:"Data",type:"custom",data:Data.triggers,index:1}),

			new series({name:"Trend",type:"line",data:Data.trend.trend,color:"dodgerblue",width:1,index:2,fill:true}),
			new series({name:"Peak",type:"line",data:Data.trend.peak,color:"dodgerblue",index:2,style:"dots",width:1}),		
			new series({name:"Buy",type:"scatter",data:Data.trend.buy,color:"lime",index:2}),
			new series({name:"Sell",type:"scatter",data:Data.trend.sell,color:"red",index:2}),

			new series({name:"Inertia",type:"line",data:Data.inertia.inertia,color:"darkorange",fill:true,index:3}),
			new series({name:"Peak",type:"line",data:Data.inertia.peak,color:"black",index:3,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data.inertia.buy,color:"lime",index:3}),
			new series({name:"Sell",type:"scatter",data:Data.inertia.sell,color:"red",index:3}),

			new series({name:"Speed",type:"line",data:Data.speed.speed,color:"SeaGreen",fill:true,index:4}),
			new series({name:"Peak",type:"line",data:Data.speed.peak,color:"black",index:4,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data.speed.buy,color:"lime",index:4}),
			new series({name:"Sell",type:"scatter",data:Data.speed.sell,color:"red",index:4}),

			new series({name:"Orders",type:"line",data:Data.orders.orders,color:"violet",fill:true,index:5}),
			new series({name:"Peak",type:"line",data:Data.orders.peak,color:"black",index:5,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data.orders.buy,color:"lime",index:5}),
			new series({name:"Sell",type:"scatter",data:Data.orders.sell,color:"red",index:5}),

			new series({name:"Incline",type:"line",data:Data.incline.short,color:"blue",fill:true,index:6}),
			new series({name:"Peak",type:"line",data:Data.incline.peakshort,color:"blue",index:6,style:"dots",width:1}),
			new series({name:"Incline",type:"line",data:Data.incline.long,color:"orange",fill:true,index:6}),
			new series({name:"Peak",type:"line",data:Data.incline.peaklong,color:"orange",index:6,style:"dots",width:1}),
			new series({name:"Buy",type:"scatter",data:Data.incline.buy,color:"lime",index:6}),
			new series({name:"Sell",type:"scatter",data:Data.incline.sell,color:"red",index:6}),


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
				//restore: {},
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
		params.forEach((p, i) => {
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
				Object.keys(p.data[2]).forEach((k) => {
					if(row.indexOf(k) > -1){
						newstring += "<div class='dataitem triggers'>"+k + ":<span>" + p.data[2][k] + " </span></div>";
					}else{
						newstring2 += "<div class='dataitem'>"+k + ":<span>" + p.data[2][k] + " </span></div>";
					} 
				});
				string += newstring + "<div class='spacer'></div>";
				string += newstring2 +"<div class='spacer'></div>";
				//if (i === params.length - 1) string += "</div>";
				
			}
			let C = row2.indexOf(p.seriesName) > -1?" peaked":"";
			string += ("<div class='dataitem"+C+"'>" + p.seriesName + ": <span>" + p.data[1] + "</span></div>");
			if (i === params.length - 1) string += "</div>";			
			index = p.axisIndex;
		});
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

function setData() {
	Data = {
		price:{
			price: [],
			buy:(Data?Data.price.buy:[]),
			sell:(Data?Data.price.sell:[]),
			average:[],
			target:[]
		},
		inertia:{
			inertia:[],
			buy:(Data?Data.inertia.buy:[]),
			sell:(Data?Data.inertia.sell:[]),
			peak:[]
		},
		trend:{
			trend:[],
			buy:(Data?Data.trend.buy:[]),
			sell:(Data?Data.trend.sell:[]),
			peak:[],
		},
		speed:{
			speed:[],
			buy:(Data?Data.speed.buy:[]),
			sell:(Data?Data.speed.sell:[]),
			peak:[]
		},
		orders: {
			orders: [],
			buy:(Data?Data.orders.buy:[]),
			sell:(Data?Data.orders.sell:[]),
			peak: []
		},
		incline: {
			short: [],
			long: [],
			buy:(Data?Data.incline.buy:[]),
			sell:(Data?Data.incline.sell:[]),
			peakshort: [],
			peaklong: []
		},
		peaked:{
			peak:[],
			good:[],
			total:[],
			glut:[],
			doldrum:[],
			buy:(Data?Data.peaked.buy:[]),
			sell:(Data?Data.peaked.sell:[]),			
		}
	};
}