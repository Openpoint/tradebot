"use strict";

/* eslint-disable no-console */
const fs = require("fs-extra");
const path = require("path");
const sPath = path.join(__rootdir,"settings/settings.json");
const stPath = path.join(__rootdir,"settings/settings_temp.json");


const G = {
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
		last_price:0,
		last_profit_time:0,
		first_trade:false,
		orders:0,	
		loading:true,
		ready:false,
		glut:false,
		debug:{},
		triggers:{},
		triggered:{},
		dev:process.argv[2] === "development"?true:false,
		record:process.argv[2] === "recorder"?true:false
	},
	State:{
		shortcount:0,
		longcount:0,
		sellshortcount:0,
		buyshortcount:0,
		selllongcount:0,
		buylongcount:0,
		shortprice:0,
		longprice:0,
		vol_sell_short:0,
		vol_sell_long:0,
		vol_buy_short:0,
		vol_buy_long:0,
		amount_sell_short:0,
		amount_sell_long:0,
		amount_buy_short:0,
		amount_buy_long:0,
		price_sell_short:0,
		price_sell_long:0,
		price_buy_short:0,
		price_buy_long:0,
	}	
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
Object.keys(settings).forEach(function(k){
	G[k] = settings[k];
	exports[k] = G[k];
});
