"use strict";
const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const express = require('express')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const settings = require('./settings.json');
const filename = path.join(__dirname,settings.datafile);

function getData(){
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
	return data;
}

io.on('connection', function(client){
	const data = getData();
	client.emit("all",data);
});

app.use("/js", express.static(__dirname + "/web/js"));
app.use("/css", express.static(__dirname + "/web/css"));
app.use("/node_modules", express.static(__dirname + "/node_modules"));
/*
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
*/

app.get('/', function(req, res){
	res.sendFile(__dirname + '/web/index.html');
});

server.listen(settings.port);

module.exports = io;