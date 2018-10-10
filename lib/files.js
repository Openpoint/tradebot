"use strict";

/* eslint-disable no-console */

const path = require("path");
const LZString = require("lz-string");
const fs = require("fs");
const {state} = require("./globals.js");
const time = require("./tools/time.js");
const sPath = path.join(__rootdir,"settings/settings.json");

let logger;

const settings = require(sPath);
let logfile = path.join(__rootdir,"web/data",settings.datafile);
if(state.dev){
	logfile = path.join(__rootdir,"web/data/dev",settings.datafile);
	let dir = path.join(__rootdir,"web/data/dev");
	if(!fs.existsSync(dir)) fs.mkdirSync(dir);
	fs.readdirSync(dir).filter((file)=>{
		return file.startsWith(settings.datafile);
	}).forEach((file)=>{
		fs.unlinkSync(path.join(dir,file));
	});
}

let file;
let writeBuffer = [];
let buffering = false;
const goWrite = exports.goWrite = function(type,data,skip){

	let ts = logfile+time.datestamp(data[0]/1000).file;
	if(!state.writeFile && !state.dev && state.loading && !fs.existsSync(ts)) state.writeFile = true;
	let good = state.dev || state.writeFile;
	if(!skip && (buffering || ts!==file)){
		if(buffering){
			writeBuffer.push([type,data]);
			return;
		}
		buffering = true;
		file = ts;
		if(logger) logger.end();
		if(good) writeBuffer.push([type,data]);
		logger = fs.createWriteStream(file,{
			flags:"a",
			encoding:"ucs2"
		});
		logger.on("open",function(){
			buffering = false;
			for(let i=0;i < writeBuffer.length;i++){
				let buf = writeBuffer[i];
				goWrite(buf[0],buf[1],true);
			}
			writeBuffer = [];
		});
		return;
	}
	if(!good) return;
	let json = {};
	json[type]=data;
	try{
		json = JSON.stringify(json);
		logger.write(LZString.compress(json)+"\n");
	}
	catch(e){
		return;
	}
};