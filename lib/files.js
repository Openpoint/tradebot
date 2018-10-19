"use strict";

/* eslint-disable no-console */

const path = require("path");
const LZString = require("lz-string");
const fs = require("fs");
const {state,sauce,webFilePrefix} = require("./globals.js");
const time = require("./tools/time.js");

let web;
let writer;
let lastFile;
let writeFile;
let dir;
if(state.dev){
	dir = path.join(__rootdir,"web/data/development");
	writeFile = path.join(dir,webFilePrefix);
	if(!fs.existsSync(dir)) fs.mkdirSync(dir);
	fs.readdirSync(dir).filter((file)=>{
		return file.startsWith(webFilePrefix);
	}).forEach((file)=>{
		fs.unlinkSync(path.join(dir,file));
	});
}else{
	dir = path.join(__rootdir,"web/data/production");
	writeFile = path.join(dir,webFilePrefix);
	if(!fs.existsSync(dir)) fs.mkdirSync(dir);
	lastFile = fs.readdirSync(dir);
	lastFile = lastFile.length?lastFile[lastFile.length-1]:false;
}

let file;
let writeBuffer = [];
let buffering = true;
let lastTime;
let newData = {};
if(!state.dev && lastFile){
	let trades = fs.readFileSync(path.join(dir,lastFile),{
		encoding:"ucs2"
	}).split("\n").reverse();

	trades.some((line)=>{
		let trade;
		try {
			trade = LZString.decompress(line);
			trade = JSON.parse(trade);
		}
		catch(e){
			trade = false;
		}
		if(trade && typeof trade === "object" && trade[Object.keys(trade)[0]][0]){
			lastTime = trade[Object.keys(trade)[0]][0];
			return true;
		}
		return false;
	});
}
const goWrite = exports.goWrite = function(type,data,skip){
	if(lastTime && data[0] <= lastTime) return;
	let ts = writeFile+time.datestamp(data[0]/1000).file;
	if(!skip && (buffering || ts!==file)){
		if(buffering){
			writeBuffer.push([type,data]);
			if(writer) return;
		}
		if(file !== ts) buffering = true;
		file = ts;
		if(writer) writer.end();
		writer = fs.createWriteStream(file,{
			flags:"a",
			encoding:"ucs2"
		});
		writer.on("open",function(){
			buffering = false;
			for(let buf of writeBuffer){
				goWrite(buf[0],buf[1],true);
			}
			writeBuffer = [];
		});
		return;
	}
	let json = {};
	json[type]=data;
	if(!web){
		web = require("./globals.js").web;
	}
	const key = Object.keys(json)[0];
	if(!newData[key])newData[key] = [];
	newData[key].push(json[key]);
	let t;
	if(newData.Trade){
		const start = newData.Trade[0][0];
		const end = newData.Trade[newData.Trade.length-1][0];
		const diff = (end - start)/1000;
		if(diff >= (state.loading?("2h").toSeconds():sauce.short_average)) t=true;
	}
	if(t || newData.buysell){
		web.send({update:newData});
		newData = {};
	}
	
	try{
		json = JSON.stringify(json);
		writer.write(LZString.compress(json)+"\n");
	}
	catch(e){
		return;
	}
};