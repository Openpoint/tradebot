"use strict";
const fs = require('fs');
const express = require('express');
const app = express();

let filename = "tradedata.txt";

function getData(){
	const data = {};
	if(!fs.existsSync(filename)) return false;
	let raw = fs.readFileSync(filename,'utf8');
	raw = raw.split('\n');
	raw = raw.map((line)=>{
		return line.split('|');
	})
	raw.forEach((x)=>{	
		let type = x[0];
		if(!type) return;
		if(!data[type]) data[type]=[];
		switch(type){
			case 'trade':
				data[type].push({
					timestamp:x[1]*1,
					price:x[2]*1,
					inertia:x[3]*1,
					rate:x[4]*1
				})
				break;
			case 'orders':
				data[type].push({
					timestamp:x[1]*1,
					volume:x[2]*1,
					price:x[3]*1
				})
				break;
			case 'buy':
				data[type].push({
					timestamp:x[1]*1,
					price:x[2]*1,
					volume:x[3]*1,
					bid:x[4]*1					
				})
				break;
			case 'sell':
				data[type].push({
					timestamp:x[1]*1,
					price:x[2]*1,
					volume:x[3]*1,
					bid:x[4]*1					
				})
				break;
			case 'buyprofit':
				data[type].push({
					timestamp:x[1]*1,
					resistance:x[2]*1,
					target:x[3]==='undefined'?null:x[3]*1	
				})
				break;
			case 'sellprofit':
				data[type].push({
					timestamp:x[1]*1,
					resistance:x[2]*1,
					target:x[3]==='undefined'?null:x[3]*1					
				})
				break;
		}
	})
	return data;
}


app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/:type',function(req,res){
	if(req.query.file){
		filename = "tradedata_"+req.query.file+".txt";
	}else{
		filename = "tradedata.txt";
	}
	let type = req.params.type;
	const data = getData();
	if(data && data[type]){
		res.send(JSON.stringify(data[type]));
	}else{
		res.status(404).send('Not Found.')
	}
})
app.listen(8080);