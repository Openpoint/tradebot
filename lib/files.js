"use strict";

const path = require('path');
const LZString = require('lz-string');
const fs = require('fs');
const tools = require(path.join(__dirname,'tools/calctools.js'));
const sPath = path.join(__rootdir,'settings.json');
const stPath = path.join(__rootdir,'settings_temp.json');

let logger;
let buffer = {};
let timer = {};
const time = 1;

if(!fs.existsSync(sPath)){
	fs.createReadStream(stPath).pipe(fs.createWriteStream(sPath));
	console.log("Please fill in account details in "+sPath+", then start the application");
	exports.ready = false;
}else{
	exports.ready = true;
	const settings = require(sPath);
	const logfile = path.join(__rootdir,settings.datafile);
	if(fs.existsSync(logfile)) fs.unlinkSync(logfile);
	logger = fs.createWriteStream(logfile,{
		flags:'a',
		encoding:'ucs2'
	});
}

exports.write = function(type,data,now){
	if(type === 'buysell'){
		goWrite(data,type);
		return;
	}

	if(!timer[type]) timer[type] = [];
	if(!buffer[type]) buffer[type] = {};
	timer[type].push(data.timestamp);

	Object.keys(data).forEach((k)=>{
		if(!buffer[type][k]){
			buffer[type][k]=data[k];
		}else if(typeof data[k]==='number'){
			buffer[type][k]+= data[k]
		}
		if(typeof data[k]!=='number'){
			Object.keys(data[k]).forEach((k2)=>{
				if(!buffer[type][k][k2]){
					buffer[type][k][k2] = data[k][k2]
				}else{
					buffer[type][k][k2] += data[k][k2]
				}
			})
		}
	})
	
	if(timer[type][0] < data.timestamp-(tools.time(time)*1000)||now){
		Object.keys(buffer[type]).forEach((k)=>{
			if(typeof buffer[type][k]==='number'){
				buffer[type][k] = buffer[type][k]/timer[type].length
			}else{
				Object.keys(buffer[type][k]).forEach((k2)=>{
					buffer[type][k][k2] = buffer[type][k][k2]/timer[type].length
				})
			}
		})
		buffer[type].timestamp = (timer[type][0] + timer[type][timer[type].length-1])/2
		goWrite(buffer[type],type);
		if(now) goWrite(data,type);
		
		delete timer[type];
		delete buffer[type];
	}

}
function goWrite(data,type){
	
	let json = {};
	json[type]=data;
	try{
		json = JSON.stringify(json);
	}
	catch(e){
		return;
	}
	logger.write(LZString.compress(json)+'\n');
}