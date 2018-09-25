"use strict"

let range = []
export const week = 7*24*60*60*1000;
export const month = week*4;
export function getRange(increment){
	if(!range[0]||!range[1]){
		let now = Date.now();;
		range = [now-month,now]
	}
	if(increment){
		range = increment < 0?[range[0]-month+week,range[1]-month+week]:[range[0]+month-week,range[1]+month-week]
	}
	return {
		start:dateStamp(range[0]),
		end:dateStamp(range[1])
	}
}
export function dateStamp(ts){
	let date = new Date(ts);
	let y = date.getFullYear().toString();
	let m = (date.getMonth()+1).toString();
	let d = date.getDate().toString();
	m = m.length < 2?'0'+m:m;
	d = d.length < 2?'0'+d:d;
	return y+m+d;
}
