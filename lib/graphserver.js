"use strict";

global.__rootdir = process.cwd();

const fs = require("fs");
const path = require("path");
const LZString = require("lz-string");
let {state,port,datafile} = require("./globals.js");
require("./tools/time");

const datadir = path.join(__rootdir,state.dev?"web/data/development":"web/data/production");
const Port = (process.argv[3] && typeof parseFloat(process.argv[3]) === "number")?parseFloat(process.argv[3]):port;
const express = require("express");
const app = express();
app.use("/js", express.static(path.join(__rootdir,"web/js")));
app.use("/css", express.static(path.join(__rootdir,"web/css")));
app.use("/node_modules", express.static(path.join(__rootdir,"node_modules")));
app.use("/tools", express.static(path.join(__rootdir,"lib/tools")));
const server = require("http").createServer(app);
const io = require("socket.io")(server);

state.loading = true;
process.on("message", (m) => {
	if(m.loading) state.loading = m.loading;
});

const buffer={
	orders:[],
	trade:[]
};
const data = {
	Trade:[],
	buysell:[]
};
let files = [];
let lastfile = 0;

if(!fs.existsSync(datadir)) fs.mkdirSync(datadir);

function sendData(resolve,data){
	const filename = files.shift();
	let raw = fs.readFileSync(path.join(datadir,filename),"ucs2");
	raw = raw.split("\n");

	for(let item of raw){
		try{
			item = LZString.decompress(item);
			item = JSON.parse(item);
		}
		catch(e){
			item = false;
		}

		if(item && Object.keys(item).length){
			let key = Object.keys(item)[0];
			let compare;
			if(!data[key].length){
				data[key].push(item[key]);
			}else{
				compare = data[key][data[key].length-1];
				if(item[key][0] > compare[0]){
					data[key].push(item[key]);
				}
			}

		}
	}
	if(files.length){
		sendData(resolve,data);
	}else{
		resolve(data);
	}
}

function getData(range){

	if(!range) range = {start:0,end:false};

	files = fs.readdirSync(datadir).filter((file)=>{
		if(file.startsWith(datafile)){
			const date = parseFloat(file.replace(datafile,""));
			let thisdate = (date+"t").toSeconds();
			return date >= range.start && (range.end?date <= range.end:true) && thisdate >= lastfile;
		}
		return false;
	});
	if(files.length) lastfile = (files[files.length-1].replace(datafile,"")+"t").toSeconds();
	return new Promise((resolve)=>{
		if(!files.length) return resolve({});
		sendData(resolve,data);
	});

}

app.get("/", function(req, res){
	res.sendFile(path.join(__rootdir,"/web/index.html"));
});

io.on("connection", (client)=>{
	client.on("data",(range)=>{
		getData(range).then((data)=>{
			client.emit("all",data);
		});
	});
	client.on("dotrade",()=>{
		process.send("dotrade");
	});
});

server.listen(Port);
setInterval(()=>{
	if(state.loading) return;
	Object.keys(buffer).forEach((k)=>{
		if(buffer[k].length){
			//this.io.emit(k,buffer[k]);
			buffer[k]=[];
		}
	});
},5000);



/*
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
*/

/*
exports.emit = function(type,data){
	if(state.loading) return;
	if(type==="orders"||type==="trade"){
		buffer[type].push(data);
		return;
	}
	//io.emit(type,data);
};
*/