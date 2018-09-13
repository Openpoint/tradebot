"use strict";

exports.globals = {
	vars:{
		smooth:8*60,
		smooth_short:30,
		cut:12*60,			//time period in minutes before losses are cut and profit line reset
		cut_limit:100,		//range in fiat price needs to be outside of profit to declare an emergency and reset profit line
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
		order_inertia:0,	
		loading:true,
		ready:false,
		glut:false
	}	
}