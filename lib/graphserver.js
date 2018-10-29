"use strict";

global.__rootdir = process.cwd();

const fs = require("fs");
const path = require("path");
const LZString = require("lz-string");
let {state,port,webFilePrefix} = require("./globals.js");
const time = require("./tools/time");
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
process.on("message", (message) => {
	if(typeof message.loading !== "undefined") state.loading = message.loading;
	if(typeof message.update !== "undefined") io.emit("update",message.update);
});


const DataStore = {};
let files = [];
if(!fs.existsSync(datadir)) fs.mkdirSync(datadir);

function makeData(callback){
	const filename = files.shift();
	const dataKey = filename.replace(webFilePrefix,"");
	if(!DataStore[dataKey] || !DataStore[dataKey].full){
		DataStore[dataKey] = {
			Trade:[],
			buysell:[],
			full:false
		};
		DataStore[dataKey].full = files.length >= 1?true:false;
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
				const key = Object.keys(item)[0];
				DataStore[dataKey][key].push(item[key]);
			}
		}
	}
	if(files.length){
		makeData(callback);
	}else{
		callback();
	}
}

function getFiles(callback){
	files = fs.readdirSync(datadir).filter((file)=>{
		return file.startsWith(webFilePrefix);
	});
	if(!files.length){
		const now = new Date().getTime()/1000;
		let today = (time.datestamp(now).file+"t").toSeconds();
		callback({
			start:today,
			end:today
		});
	}else{
		callback({
			start:(files[0].replace(webFilePrefix,"")+"t").toSeconds(),
			end:(files[files.length-1].replace(webFilePrefix,"")+"t").toSeconds()
		});
	}
}

app.get("/", function(req, res){
	res.sendFile(path.join(__rootdir,"/web/index.html"));
});

io.on("connection", (client)=>{
	client.on("getDate",()=>{
		getFiles((range)=>{
			client.emit("gotDate",range);
		});
	});
	
	client.on("data",(range)=>{
		range = {
			start:time.datestamp(range.start).file,
			end:time.datestamp(range.end).file
		};
		getFiles(()=>{
			makeData(()=>{
				const dates = Object.keys(DataStore).sort().filter((dataDate)=>{
					return dataDate >= range.start && dataDate <= range.end;
				});
				const data = {
					Trade:[],
					buysell:[]
				};
				for (let dataDate of dates){
					data.Trade = data.Trade.concat(DataStore[dataDate].Trade);
					data.buysell = data.buysell.concat(DataStore[dataDate].buysell);
				}
				client.emit("all",data);
			});
		});
	});

	/*
	client.on("dotrade",()=>{
		process.send("dotrade");
	});
	*/
});

server.listen(Port);

/*
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
*/
