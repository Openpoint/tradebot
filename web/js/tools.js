"use strict";

/* eslint-disable no-console */
let range = [];
const second = 1000;
const minute = 60*second;
const hour = 60*minute;
const day = 24*hour;
const week = 7*day;
const month = 30*day;
const year = 365.25*day;
export let smooth = {};
/*
export const times = {
	second:second,
	minute:minute,
	hour:hour,
	day:day,
	week:week,
	month:month,
	year:year
};
*/
export function reset(){
	smooth = {};
}
export const zoomLevels = {
	one:minute,
	two:15*minute,
	three:hour,
	four:6*hour,
	five:12*hour,
	six:day
};

export function getZoom(diff){
	if(diff <= day) return "data";
	if(diff <= 3*day) return "one";
	if(diff <= week) return "two";
	if(diff <= month) return "three";
	if(diff <= 12*month) return "four";
	if(diff <= year) return "five";
	return "six";
}

export function Smooth(level,data){
	if(!smooth.data) smooth.data = data;
	if(!smooth[level]){
		smooth[level] = [];
	}else{
		return;
	}
	this.level = level;
	this.i =0;	
	this.time = zoomLevels[level];
	
	while (this.i < smooth.data.length){
		this.flatten();
	}
}
export function updateSmooth(level,data){
	this.level = level;
	this.i =0;	
	this.time = zoomLevels[level];
	
	while (this.i < data.length){
		this.flatten(data);
	}
}
updateSmooth.prototype = Smooth.prototype;

Smooth.prototype.flatten = function(data){
	const batch = [];	
	let t = data||smooth.data;
	this.start = [t[this.i].timestamp,t[this.i].dir];	
		
	while(
		this.i < t.length && 
		(t[this.i].timestamp - this.start[0]) <= this.time && 
		t[this.i].dir === this.start[1]
	){
		batch.push(t[this.i]);
		this.i++;
	}
	const s = this.compress(batch);
	const smoothed = s[0];
	smoothed.dir = this.start[1];	
	smoothed.peaks = this.compress(s[1])[0];
	smoothed.triggers = this.compress(s[2],"trig")[0];
	smoothed.triggered = this.compress(s[3],"triggered")[0];
	smooth[this.level].push(smoothed);	
};

Smooth.prototype.compress = function(batch,trig){
	const compressed = {};
	const peaks = [];
	const triggered = [];
	const triggers = [];
	
	let i = 0;
	let i2;
	let keys;
	let k;
	let item;	
	while(i < batch.length){
		i2 = 0;
		keys = Object.keys(batch[i]);
		while(i2 < keys.length){			
			k = keys[i2];			
			item = batch[i][k];
			if(trig === "trig"){
				if(typeof compressed[k] === "undefined") compressed[k] = item?true:false;
				if(!compressed[k]) compressed[k] = item?true:false;
			}else if(trig === "triggered"){
				if(typeof compressed[k] === "undefined") compressed[k] = item;
				compressed[k] = item > compressed[k]?item:compressed[k];
			}else if(k === "timestamp"){
				if(!compressed[k]) compressed[k] = 0;
				compressed[k] += item;
			}else if(typeof item === "number"){
				if(!compressed[k]) compressed[k] = item;
				this.start[1] === "sell"?
					compressed[k] = item > compressed[k]?item:compressed[k]:
					compressed[k] = item < compressed[k]?item:compressed[k];
			}else if(k === "peaks"){
				peaks.push(item);
			}else if(k === "triggers"){
				triggers.push(item);			
			}else if(k === "triggered"){
				triggered.push(item);			
			}
			i2++;
		}
		i++;
	}
	if (compressed.timestamp) compressed.timestamp = (compressed.timestamp/batch.length).round(); 
	return [compressed,peaks,triggers,triggered];
};

export function getRange(increment){
	if(!range[0]||!range[1]){
		range = [smooth.data[0].timestamp*1000,smooth.data[smooth.data.length-1].timestamp*1000];
	}
	if(increment){
		range = increment < 0?[range[0]-month+week,range[1]-month+week]:[range[0]+month-week,range[1]+month-week];
	}
	return {
		start:dateStamp(range[0]),
		end:dateStamp(range[1])
	};
}
export function dateStamp(ts){
	let date = new Date(ts);
	let y = date.getFullYear().toString();
	let m = (date.getMonth()+1).toString();
	let d = date.getDate().toString();
	m = m.length < 2?"0"+m:m;
	d = d.length < 2?"0"+d:d;
	return y+m+d;
}