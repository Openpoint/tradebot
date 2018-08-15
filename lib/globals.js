"use strict";

exports.globals = {
	vars:{
		smooth:4*60,
		smooth_short:15,
		expense:0.25,		//the Bitstamp fee rate
	},
	wallet:{
		coin:1,
		fiat:0
	},
	state:{
		trade_dir:'sell',
		last_price:0,
		first_trade:false,
		order_inertia:0,	
		loading:true,
		ready:false,
	}	
}