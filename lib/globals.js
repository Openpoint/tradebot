"use strict";

/* eslint-disable no-console */
const fs = require("fs-extra");
const path = require("path");
const sPath = path.join(__rootdir,"settings/settings.json");
const stPath = path.join(__rootdir,"settings/settings_temp.json");
const {initTime} = require("./tools/time");
const {initMoney} = require("./tools/money");

const G = exports.G = {
	vars:{
		expense:0.25,		//the Bitstamp fee rate
		invest:{
			coin:1,
			fiat:0
		}
	},
	wallet:{},
	bank:{
		coin:0,
		fiat:0
	},
	state:{
		trade_dir:"sell",
		opp_trade_dir:"buy",
		last_price:0,
		last_profit_time:0,
		first_trade:false,
		orders:0,
		loading:true,
		ready:false,
		glut:false,
		debug:{},
		triggers:{
			emergency:false
		},
		peaks:{},
		isPeaked:{},
		triggered:{},
		dev:process.argv[2] === "development"?true:false,
		record:process.argv[2] === "recorder"?true:false,
		loglevel:0,
		recovered:false
	},
	web:false,
	getter:false
};
if(!fs.existsSync(sPath)){
	fs.copySync(stPath,sPath);
	console.error("Please fill in account details in "+sPath+", then start the application");
	process.exit();
}
Object.keys(G).forEach(function(k){
	exports[k] = G[k];
});
const settings = require("../settings/settings.json");

for(let key of Object.keys(settings.sauce)){
	let setting = settings.sauce[key];
	
	if(typeof setting === "string"){
		settings.sauce[key] = setting.toSeconds();
	}else{
		for(let key2 of Object.keys(setting)){			
			if(typeof setting[key2] === "number") setting[key2] = setting[key2].factor();
			if(typeof setting[key2] === "string") setting[key2] = setting[key2].toSeconds();
			if(typeof setting[key2] === "object"){				
				for (let i in setting[key2]){
					if(typeof setting[key2][i] === "number") setting[key2][i] = setting[key2][i].factor();
				}
			}
		}
	}
}
for(let key of Object.keys(settings)){
	G[key] = settings[key];
	exports[key] = G[key];
}
exports.setGetter = function(getter){
	G.getter = exports.getter = getter;
};
exports.setWeb = function(web){
	G.web = exports.web = web;
};
initMoney();
initTime();
