"use strict";
const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const express = require('express')

const settings = require(path.join(__rootdir,'settings.json'));
const filename = path.join(__rootdir,settings.datafile);
const buffer={
	orders:[],
	trade:[]
}



exports.web = function(){
	this.app = express();
	this.app.use("/js", express.static(path.join(__rootdir,'web/js')));
	this.app.use("/css", express.static(path.join(__rootdir,'web/css')));
	this.app.use("/node_modules", express.static(path.join(__rootdir,'node_modules')));
	this.server = require('http').createServer(this.app);
	this.io = require('socket.io')(this.server);
	this.getData = function(){
		return new Promise((resolve,reject)=>{
			const data = {};
			if(!fs.existsSync(filename)) return false;
			let raw = fs.readFileSync(filename,'ucs2');
			raw = raw.split('\n');
			raw.forEach((item)=>{
				item = LZString.decompress(item);
				try{
					item = JSON.parse(item);
				}
				catch(e){return};
				if(!item) return;
				let key = Object.keys(item)[0];
				if(!data[key])data[key] = [];
				data[key].push(item[key]);
			})
			resolve(data);
		})

	}
	this.app.get('/', function(req, res){
		res.sendFile(path.join(__rootdir,'/web/index.html'));
	});
	this.io.on('connection', (client)=>{
		const data = this.getData().then((data)=>{
			client.emit("all",data);
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
		})	
	},5000)
	return this;
}





/*
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
*/







exports.emit = function(type,data){
	if(state.loading) return;
	if(type==='orders'||type==='trade'){
		buffer[type].push(data);
		return;
	}
	//io.emit(type,data);
}
