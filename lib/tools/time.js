"use strict";

const {sauce,vars} = require("../globals.js");

const toSeconds = exports.toSeconds = function(time){
	let type = time.slice(-1);
	time = time.replace(type,"");
	if(type === "m") return minute(parseFloat(time));
	if(type === "h") return hour(parseFloat(time));
	if(type === "d") return day(parseFloat(time));
	if(type === "s") return parseFloat(time);
	if(type === "t") return Math.round(Date.parse(toIso(time))/1000);
	throw new Error("Invalid time format");
};


const timestamp = exports.timestamp = {
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

exports.timefilter = function(array,timeago,stamp){
	if(sauce[timeago]){
		timeago = sauce[timeago];
	}else if(vars[timeago]){
		timeago = vars[timeago];
	}else{
		timeago = toSeconds(timeago);
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

exports.datestamp = function(time){
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
		file:date.getFullYear().toString()+month.toString()+day.toString()
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
const toIso = exports.toIso = function(t){
	t = t.toString();
	let now = [
		t.slice(0,4),
		t.slice(4,-2),
		t.slice(-2)
	].join("-");
	return now;
};

sauce.smoothing = toSeconds(sauce.smoothing);
sauce.long_average = toSeconds(sauce.long_average);
sauce.short_average = toSeconds(sauce.short_average);
sauce.decay_time = toSeconds(sauce.decay_time);
sauce.scale = sauce.short_average/sauce.long_average;
sauce.emergency.cut = toSeconds(sauce.emergency.cut);