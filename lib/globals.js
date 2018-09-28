"use strict";

exports.globals = {
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
		trade_dir:'sell',
		last_price:0,
		last_profit_time:0,
		first_trade:false,
		emergency:false,
		orders:0,	
		loading:true,
		ready:false,
		glut:false
	}	
}