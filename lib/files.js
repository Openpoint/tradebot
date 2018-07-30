"use strict";

const path = require('path');
const LZString = require('lz-string');
const fs = require('fs');
const sPath = path.join(__rootdir,'settings.json');
const stPath = path.join(__rootdir,'settings_temp.json');
let logger;

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

exports.write = function(type,data){
	let json = {};
	json[type] = data;
	try{
		json = JSON.stringify(json);
	}
	catch(e){
		return;
	}
	logger.write(LZString.compress(json)+'\n');
}