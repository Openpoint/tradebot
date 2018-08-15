"use strict";

const path = require('path');
const LZString = require('lz-string');
const fs = require('fs');
const tools = require(path.join(__dirname,'tools/calctools.js'));
const sPath = path.join(__rootdir,'settings.json');
const stPath = path.join(__rootdir,'settings_temp.json');

let logger;
let logfile;

if(!fs.existsSync(sPath)){
	fs.createReadStream(stPath).pipe(fs.createWriteStream(sPath));
	console.log("Please fill in account details in "+sPath+", then start the application");
	exports.ready = false;
}else{
	exports.ready = true;
	const settings = require(sPath);
	logfile = path.join(__rootdir,'web/data',settings.datafile);
	let dir = path.join(__rootdir,'web/data')
	fs.readdirSync(dir).filter((file)=>{
		return file.startsWith(settings.datafile)
	}).forEach((file)=>{
		fs.unlinkSync(path.join(dir,file))
	})

}

let file;
let writeBuffer = [];
let buffering = false;
const goWrite = exports.goWrite = function(type,data,skip){
	let ts = logfile+tools.timestamp(data.timestamp,true);
	if(!skip && (buffering || ts!==file)){
		if(buffering){
			writeBuffer.push([type,data])
			return;
		}
		buffering = true;
		file = ts;
		if(logger) logger.end();
		writeBuffer.push([type,data])
		logger = fs.createWriteStream(file,{
			flags:'a',
			encoding:'ucs2'
		});
		logger.on('open',function(){
			buffering = false;
			for(let i=0;i < writeBuffer.length;i++){
				let buf = writeBuffer[i];
				goWrite(buf[0],buf[1],true);
			}
			writeBuffer = [];
		})
		return;
	}
	let json = {};
	json[type]=data;
	try{
		json = JSON.stringify(json);
		logger.write(LZString.compress(json)+'\n');
		
	}
	catch(e){
		return;
	}
	
}