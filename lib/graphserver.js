"use strict";

const fs = require("fs");
const path = require("path");
const LZString = require("lz-string");
const express = require("express");

const settings = require(path.join(__rootdir,"settings/settings.json"));
const datadir = path.join(__rootdir,state.dev?"web/data/dev":"web/data");

if(process.argv[3] && typeof parseFloat(process.argv[3]) === "number") settings.port = parseFloat(process.argv[3]);
const buffer={
	orders:[],
	trade:[]
};



exports.web = function(){
	this.app = express();
	this.app.use("/js", express.static(path.join(__rootdir,"web/js")));
	this.app.use("/css", express.static(path.join(__rootdir,"web/css")));
	this.app.use("/node_modules", express.static(path.join(__rootdir,"node_modules")));
	this.server = require("http").createServer(this.app);
	this.io = require("socket.io")(this.server);
	
	this.sendData = function(resolve,data){
		this.filename = this.files.shift();
		let raw = fs.readFileSync(path.join(datadir,this.filename),"ucs2");
		raw = raw.split("\n");
		raw.forEach((item)=>{
			item = LZString.decompress(item);
			try{
				item = JSON.parse(item);
			}
			catch(e){return;}
			if(!item) return;
			let key = Object.keys(item)[0];
			if(!data[key])data[key] = [];
			data[key].push(item[key]);
		});
		if(this.files.length){
			this.sendData(resolve,data);
		}else{
			resolve(data);
		}		
	};
	this.getData = function(range){
		const data = {};
		this.files = fs.readdirSync(datadir).filter((file)=>{

			if(file.startsWith(settings.datafile)){
				const date = parseFloat(file.replace(settings.datafile,""));
				return date >= range.start && date <= range.end;
			}
			return false;
		});
		return new Promise((resolve)=>{
			if(!this.files.length) return resolve({});
			this.sendData(resolve,data);
		});

	};
	this.app.get("/", function(req, res){
		res.sendFile(path.join(__rootdir,"/web/index.html"));
	});

	this.io.on("connection", (client)=>{
		client.on("data",(range)=>{
			this.getData(range).then((data)=>{
				client.emit("all",data);
			});
		});		
	});

	this.server.listen(settings.port);
	setInterval(()=>{
		if(state.loading) return;
		Object.keys(buffer).forEach((k)=>{
			if(buffer[k].length){
				//this.io.emit(k,buffer[k]);
				buffer[k]=[];
			}
		});	
	},5000);
	return this;
};





/*
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
*/







exports.emit = function(type,data){
	if(state.loading) return;
	if(type==="orders"||type==="trade"){
		buffer[type].push(data);
		return;
	}
	//io.emit(type,data);
};
