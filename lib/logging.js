"use strict";

const fs = require("fs");
const path = require("path");
const {createLogger,format,transports} = require("winston");
const {combine,timestamp,printf,splat} = format;
const {state} = require("./globals.js");

let logdir = path.join(__rootdir,"logs");
if(!fs.existsSync(logdir)) fs.mkdirSync(logdir);
if(state.dev){
	logdir = path.join(logdir,"dev");
	if(!fs.existsSync(logdir)) fs.mkdirSync(logdir);
}else if(state.record){
	logdir = path.join(logdir,"recorder");
	if(!fs.existsSync(logdir)) fs.mkdirSync(logdir);
}else{
	logdir = path.join(logdir,"production");
	if(!fs.existsSync(logdir)) fs.mkdirSync(logdir);	
}
const errfile = path.join(logdir,"error.log");
const logfile = path.join(logdir,"combined.log");
const dateOptions = {
	day:"numeric",
	month:"numeric",	
	year:"numeric",
	hour:"numeric",
	minute:"numeric",
	second:"numeric"
};
const jsonFormatter = printf(info => {
	const date  = new Date(info.timestamp).toLocaleDateString(false,dateOptions);
	const message  = typeof info.message === "object"?JSON.stringify(info.message,false,2):info.message?info.message.toString():"undefined";
	return `${date} [${info.level}] ${message}`;	
});


const Log = exports.Log = createLogger({
	level:"info",
	format:combine(timestamp(),splat(),jsonFormatter),
	transports: [
		new transports.File({
			filename:errfile,
			level:"error",
			maxsize:"1m",
			maxFiles:5
		}),
		new transports.File({
			filename:logfile,
			maxsize: "1m",
			maxFiles:5
		})
	]
});

if (state.dev || !state.dev) {
	Log.add(new transports.Console({
		format:combine(timestamp(),splat(),jsonFormatter),
	}));
}

//Logging to parent from child process
function message(type,mess){
	const m = {Log:{}};
	m[type] = mess;
	return m;
}
exports.rLog = {
	info:function(m){
		process.send(message("info",m));
	},
	error:function(m){
		process.send(message("error",m));
	},
};
