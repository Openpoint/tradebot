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
		if(ts.toString().length <= 13) ts = ts*1000;
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

timeG.Ex.datestamp = function(time){
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
		web:date.getFullYear().toString().substr(-2)+"/"+month+"/"+day
	};
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