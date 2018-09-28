"use strict"

const Calc = require('../calc.js');
const File = require('../files.js');
const tools = require('./calctools.js');

module.exports.emergencyaction = function(trade){
	return state.emergency && (
		state.trade_dir === 'sell'?
			state.last_price - trade.price > sauce.emergency.limit:
			trade.price - state.last_price > sauce.emergency.limit			
	);
}

module.exports.getPrev = function(empty,trade,prev){
	return {
		price:empty?0:trade.price,
		price_target:empty?0:prev.price_target,
		sentiment:empty?0:state.sentiment,
		speed:empty?0:state.speed,
		inertia:empty?0:state.trade_inertia,
		orders:empty?0:state.orders,
		incline:empty?0:state.price_incline
	}
}

module.exports.message = function(e,c){
	state.message = false;
	if(state.doldrum||state.glut||e||c){
		state.message = 
			(state.doldrum?(' Doldrum:'+state.doldrum):'')+
			(state.glut?(' Glut:'+state.glut):'')+
			(e?(' Emergencyaction:'+e):'')+
			(c?(' Cliff-face:'+c):'');
	}
}

module.exports.goTrade = function(trade,peak,prev){
	//console.log(state.debug.peaks);
	if(!state.dev){
		state.inTrade = true;
		Calc.setwallet((err)=>{
			if(err){
				Log.error(err);
				state.inTrade = false;
				return;
			}
			Calc.wallet(trade,prev.price_target,(err,item)=>{
				if(err && !item){
					Log.error('Trade error: %s',err);
					state.inTrade = false;
					return;
				}
				if(err) Log.error(err);
				finishTrade(trade,peak,item);
				state.inTrade = false;
			});
		})
	}else{
		Calc.wallet(trade,prev.price_target,(err,item)=>{
			finishTrade(trade,peak,item);	
		})
	}	
}

module.exports.resetEmergency = function(trade,prev){
	if(state.first_trade && state.emergency){		
		state.trade_dir === 'sell'?
			trade.price > prev.price_target?reset(prev):null:
			trade.price < prev.price_target?reset(prev):null
	}
}
function reset(prev){
	state.emergency = false;
	state.price_target = prev.price_target
}

function getPeaks(){
	return {
		sentiment:state.sentiment,
		inertia:state.trade_inertia,
		speed:state.speed,		
		orders:state.orders,
		incline:state.price_incline
	}
}

function finishTrade(trade,peak,item){
	peak = new getPeaks();
	state.last_profit_time = trade.timestamp;
	state.last_price = item.price;
	state.price_target = tools.bid(state.last_price);
	File.goWrite('buysell',item);
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
}