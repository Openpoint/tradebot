"use strict";

const path = require("path");
const fs = require("fs");
const LZString = require("lz-string");
const {state} = require("../lib/globals.js");
const {Log} = require("../lib/logging.js");
const time = require(path.join(__rootdir,"lib/tools/time.js"));
const dir = state.record?
	path.join(__rootdir,"recorder/data/recording"):
	path.join(__rootdir,"recorder/data/",state.dev?"development":"production");

let datafile;
let logger;

exports.input = function(trade){
	const data = {
		t:{
			amount:trade.amount,
			timestamp:trade.timestamp,
			price:trade.price,
			type:trade.type
		}
	};
	if(state.order_bids && state.order_asks){
		data.b = state.order_bids;
		data.a = state.order_asks;
		if(state.record){
			state.order_bids = false;
			state.order_asks = false;
		}
	}
	write(data);
};


function start(ts){
	datafile = path.join(dir,"record"+time.datestamp(ts).file);
	if(!fs.existsSync(dir)) fs.mkdirSync(dir);
	if(fs.existsSync(datafile) && logger) return;
	if(!state.record) prune(datafile,dir);
	
	if(logger) logger.close();    
	logger = fs.createWriteStream(datafile,{
		flags:"a",
		encoding:"ucs2"
	});
}
function prune(datafile,dir){
	let now = datafile.split("/").pop().replace("record","");
	now = (now+"t").toSeconds();
	let ago = ("3d").toSeconds();
	let files = fs.readdirSync(dir).filter((f)=>{           
		if(f.startsWith("record")){
			let then = f.replace("record","")+"t";
			then = then.toSeconds();
			return now - then >= ago;
		}           
		return false; 
	});
	files.forEach((f)=>{
		let file = path.join(dir,f);
		fs.unlinkSync(file);
	});
}
function write(data){
	try {
		let ts = data.t.timestamp;
		data = LZString.compress(JSON.stringify(data));
		start(ts);
		logger.write(data+"\n");
	} 
	catch(err){
		Log.error(err);
	}
}
