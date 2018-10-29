"use strict";

const timeG = {
	Ex:{}
};

String.prototype.toSeconds = function(){
	let type = this.slice(-1);
	const time = this.replace(type,"");
	if(type === "m") return minute(parseFloat(time));
	if(type === "h") return hour(parseFloat(time));
	if(type === "d") return day(parseFloat(time));
	if(type === "s") return parseFloat(time);
	if(type === "t") return Math.round(Date.parse(toIso(time))/1000);
	return this;
};

timeG.Ex.initTime = function(){
	let G = require("../globals.js");
	timeG.vars = G.vars;
	timeG.sauce = G.sauce;
};
const timestamp = timeG.Ex.timestamp = {
	seconds:function(ts){
		ts = Math.round(parseFloat(ts));
		if(ts.toString().length >= 13) ts = Math.round(ts/1000);
		return ts;
	},
	mSeconds:function(ts){
		ts = Math.round(parseFloat(ts));
		if(ts.toString().length < 13) ts = ts*1000;
		return ts;
	}
};

timeG.Ex.timefilter = function(array,timeago,stamp){
	if(timeG.sauce[timeago]){
		timeago = timeG.sauce[timeago];
	}else if(timeG.vars[timeago]){
		timeago = timeG[timeago];
	}else{
		timeago = timeago.toSeconds();
	}
	let start;
	if(stamp){
		start = timestamp.seconds(stamp) - timeago;
	}else{
		start = timestamp.seconds(array[array.length-1].timestamp) - timeago;
	}
	let trigger = true;
	let i =0;
	while(i < array.length && trigger){
		if(array[i].timestamp > start){
			trigger = false;
		}else{
			i++;
		}
	}
	array = array.slice(i);
	return array;
};

const datestamp = timeG.Ex.datestamp = function(time){
	time = timestamp.mSeconds(time);
	let date = new Date(time);
	let month =  date.getMonth()+1;
	if(month.toString().length < 2) month = "0"+month;
	let day = date.getDate();
	if(day.toString().length < 2) day = "0"+day;
	let hours = date.getHours();
	if(hours.toString().length < 2) hours = "0"+hours;
	let minutes = date.getMinutes();
	if(minutes.toString().length < 2) minutes = "0"+minutes;
	return {
		log:day+"/"+month+" - "+hours+":"+minutes,
		file:date.getFullYear().toString()+month.toString()+day.toString(),
		web:date.getFullYear().toString().substr(-2)+"/"+month+"/"+day,
		iso:date.toISOString().slice(0,10)
	};
};

const makeDay = timeG.Ex.makeDay = function(timeStamp){
	let date = datestamp(timeStamp).file;
	date = (date+"t").toSeconds();
	return date;
};

let inputStart,inputEnd;
const web = timeG.Ex.web = {
	dateSpan:((7*4*2)+"d").toSeconds(),
	dateRange:{start:0,end:0},
	changed:true,
	setRange:function(range){
		let beginDate = range.end - web.dateSpan;
		if(beginDate < range.start) beginDate = range.start;
		web.dateRange = {
			start:beginDate,
			end:range.end,
			first:range.start
		};
		if(!web.oldVal) web.oldVal = {
			start:web.dateRange.start,
			end:web.dateRange.end
		};
	},
	changeRange:function(that){
		const position = that.className;
		const timestamp = makeDay(new Date(that.value).getTime());
		web.dateRange[position] = timestamp;
		if(position === "start"){
			const diff = timestamp + web.dateSpan;
			if(web.dateRange.end > diff) web.dateRange.end = diff;
		}else{
			const diff = timestamp - web.dateSpan;
			if(web.dateRange.start < diff) web.dateRange.start = diff;
		}
		web.changed = web.dateRange[position] !== web.oldVal[position];
		web.resetRange();
	},
	resetRange(){
		web.oldVal = {
			start:web.dateRange.start,
			end:web.dateRange.end
		};
		const range = {
			start:datestamp(web.dateRange.start).iso,
			end:datestamp(web.dateRange.end).iso
		};		
		inputStart.value = range.start;
		inputEnd.value = range.end;
	},
	updateRange:function(buffer){
		let data = buffer.Trade || buffer.buysell;
		let last = makeDay(data[data.length-1].timestamp);
		last = datestamp(last).iso;
		inputEnd.value = last;
		inputEnd.max = last;
		inputStart.max = last;
	},
	setInputs:function(Start,End){
		inputStart = Start;
		inputEnd = End;
		const range = {
			start:datestamp(web.dateRange.start).iso,
			end:datestamp(web.dateRange.end).iso,
			first:datestamp(web.dateRange.first).iso
		};
		inputStart.value = range.start;
		inputStart.min = range.first;
		inputStart.max = range.end;
		inputEnd.value = range.end;
		inputEnd.min = range.start;
		inputEnd.max = range.end;
	}
};

function minute(m){
	return m*60;
}
function hour(h){
	return minute(h)*60;
}
function day(d){
	return hour(d)*24;
}
const toIso = timeG.Ex.toIso = function(t){
	t = t.toString();
	let now = [
		t.slice(0,4),
		t.slice(4,-2),
		t.slice(-2)
	].join("-");
	return now;
};

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory);
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.tb_time = factory();
	}
}(typeof self !== "undefined" ? self : this, function () {
	return timeG.Ex;
}));