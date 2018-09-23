"use strict"

const Calc = require('./calc.js');
const File = require('./files.js');
const tools = require('./tools/calctools.js');
const path = require('path');
const sauce = require(path.join(__rootdir,"settings.json")).sauce;

const glutlimit = sauce.glutlimit;
const limits = sauce.limits;
let peak = {};
let prev = {
	price:0,
	price_target:0,
	bull_bear:0,
	frenzy:0,
	inertia:0,
	orders:0
}

module.exports.addTrade = function(trade){
	trade = Calc.trade(trade);
	if(!trade) return;
	const check = new Check(trade);
	const emergencyaction = state.emergency && (
		state.trade_dir === 'sell'?
			state.last_price - trade.price > limits.profitable[1]:
			trade.price - state.last_price > limits.profitable[1]			
	);
	const good = 
		!state.inTrade && 
		(emergencyaction || check.init(trade)) && 
		state.ready && 
		(state.dev?true:state.loaded);
		//state.loaded

	if(good){
		if(state.doldrum||state.glut||emergencyaction){
			Log.info(tools.timestamp(trade.timestamp)+' Doldrum:'+state.doldrum+' Glut:'+state.glut,' Emergencyaction:'+emergencyaction);			
		}
		if(!state.inTrade) goTrade(trade);		
	}
	/*
	if(!state.testtrade && !state.loading){
		goTrade(trade);
		state.testtrade = true;
	}
	*/
	prev = {
		price:trade.price,
		price_target:prev.price_target,
		bull_bear:state.bull_bear,
		frenzy:state.rate_frenzy,
		inertia:state.trade_inertia,
		orders:state.orders,
		incline:state.price_incline
	}
	if(!state.emergency) prev.price_target = state.price_target;
}

function goTrade(trade){

	state.inTrade = true;

	Calc.wallet(trade,(err,item)=>{
		if(err && !item){
			Log.error('Trade error: %s',err);
			state.inTrade = false;
			return;
		}
		if(err) Log.error(err);
		peak = {
			inertia:state.trade_inertia,
			frenzy:state.rate_frenzy,
			bull_bear:state.bull_bear,
			orders:state.orders,
			incline:state.price_incline
		};
		state.last_price = item.price;
		state.price_target = tools.bid(state.last_price);
		File.goWrite('buysell',item);
		state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
		state.inTrade = false;
	});
	//if(!state.loading) web.emit('buysell',item);
	
}

function Check(trade){
	let good;

	if(state.first_trade && state.emergency){
		
		function reset(){
			state.emergency = false;
			state.price_target = prev.price_target
		}
		state.trade_dir === 'sell'?
			trade.price > prev.price_target?reset():null:
			trade.price < prev.price_target?reset():null
	}

	this.init = function(trade){
		peak = state.peaks = Peak(trade);
		peaked(trade)
		if(!state.ready) return false;		
		if(this.profitable(trade)){
			this.glut(trade);
			if(!state.peaked){
				good = false;
			}else{
				good = 
					this.bull_bear(trade) &&
					this.inertia(trade) &&
					(state.glut||state.doldrum?
						(this.frenzy() || this.incline()) && (this.orders() || this.incline()):	
						this.frenzy() || this.orders() || this.incline()
					);				
			}
		}else{
			good = false;
		}					
		return good;
	}
}

Check.prototype.glut = function(trade){
	let glut;
	if(state.trade_dir === 'sell'){
		if(state.glut && (state.trade_inertia > limits.inertia[0]||state.bull_bear > limits.bull_bear[0])) return true;
		glut = 
			(state.trade_inertia > glutlimit.inertia[0] && state.bull_bear > glutlimit.bull_bear[0]) ||
			state.trade_inertia > glutlimit.inertia[0]*2 ||
			state.bull_bear > glutlimit.bull_bear[0]*2;
	}else{
		if(state.glut && (state.trade_inertia < limits.inertia[0]*-1||state.bull_bear < limits.bull_bear[0]*-1)) return true;
		glut = 
			(state.trade_inertia < glutlimit.inertia[0]*-1 && state.bull_bear < glutlimit.bull_bear[0]*-1) ||
			state.trade_inertia < glutlimit.inertia[0]*-2 ||
			state.bull_bear < glutlimit.bull_bear[0]*-2;
	}
	if(glut){
		peak.inertia = state.trade_inertia;
		peak.bull_bear = state.bull_bear;
	}
	state.glut = glut;
	const dd = [
		(
			state.trade_inertia < glutlimit.inertia[1] && 
			state.trade_inertia > glutlimit.inertia[1]*-1
		),
		(
			state.bull_bear < glutlimit.bull_bear[1] && 
			state.bull_bear > glutlimit.bull_bear[1]*-1
		),
		(
			state.orders < glutlimit.orders[1] && 
			state.orders > glutlimit.orders[1]*-1 &&
			state.rate_frenzy < glutlimit.frenzy[1] &&
			state.rate_frenzy > glutlimit.frenzy[1]*-1
		)
	]
	state.doldrum = (dd[0] && dd[1])||(dd[0] && dd[2])||(dd[1] && dd[2]);
}

Check.prototype.profitable = function(trade){	
	return state.trade_dir === 'sell'?
		trade.price > state.price_target &&
		trade.price < prev.price + limits.profitable[0]:

		trade.price < state.price_target &&
		trade.price > prev.price - limits.profitable[0];
}

Check.prototype.bull_bear = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === 'sell'?
		peak.bull_bear > limits.bull_bear[0] && 
		state.bull_bear > (glut?
			limits.bull_bear[1]*-1:
			peak.bull_bear*-1
		):

		peak.bull_bear < limits.bull_bear[0]*-1 
		&& state.bull_bear < (glut?
			limits.bull_bear[1]:
			peak.bull_bear*-1
		)
}

Check.prototype.inertia = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === 'sell'?
		peak.inertia > limits.inertia[0] && state.trade_inertia > (glut?limits.inertia[1]*-1:peak.inertia*-1):
		peak.inertia < limits.inertia[0]*-1 && state.trade_inertia < (glut?limits.inertia[1]:peak.inertia*-1)
}

Check.prototype.frenzy = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === 'sell'?
		peak.frenzy > limits.frenzy[0] && 
		state.rate_frenzy > (glut?limits.frenzy[1]*-1:peak.frenzy*-1):

		peak.frenzy < limits.frenzy[0]*-1 && 
		state.rate_frenzy < (glut?limits.frenzy[1]:peak.frenzy*-1)
}
Check.prototype.orders = function(){
	let glut = state.glut||state.doldrum;
	return state.trade_dir === 'sell'?
		peak.orders >= limits.orders[0] && 
		state.orders > (glut?limits.orders[1]*-1:peak.orders *-1):

		peak.orders <= limits.orders[0]*-1 && 
		state.orders < (glut?limits.orders[1]:peak.orders *-1)
}
Check.prototype.incline = function(){
	return state.trade_dir === 'sell'?
		peak.incline > limits.incline[0] && state.price_incline > 0:
		peak.incline < limits.incline[0]*-1 && state.price_incline < 0
}
function Peak(){
	if(state.trade_dir === "sell"){
		if(prev.bull_bear <= -5 && state.bull_bear > -5){
			peak.bull_bear = state.bull_bear;
		}
		
		if(prev.inertia <= -20 && state.trade_inertia > -20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.frenzy <= 0 && state.rate_frenzy > 0){			
			peak.frenzy = state.rate_frenzy;
		}
		if(prev.orders <= 0 && state.orders > 0){			
			peak.orders = state.orders;
		}
		if(prev.incline <= 0 && state.price_incline > 0){			
			peak.incline = state.price_incline;
		}	
	}else{
		if(prev.bull_bear >= 5 && state.bull_bear < 5){
			peak.bull_bear = state.bull_bear;
		}
		if(prev.inertia >= 20 && state.trade_inertia < 20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.frenzy >= 0 && state.rate_frenzy < 0){
			peak.frenzy = state.rate_frenzy;
		}
		if(prev.orders >= 0 && state.orders < 0){
			peak.orders = state.orders;
		}
		if(prev.incline >= 0 && state.price_incline < 0){			
			peak.incline = state.price_incline;
		}
	}

	return {
		inertia:state.trade_dir === "sell"?
			state.trade_inertia >= (peak.inertia||state.trade_inertia)?state.trade_inertia:peak.inertia:
			state.trade_inertia <= (peak.inertia||state.trade_inertia)?state.trade_inertia:peak.inertia,

		frenzy:state.trade_dir === "sell"?
			state.rate_frenzy >= (peak.frenzy||state.rate_frenzy)?state.rate_frenzy:peak.frenzy:
			state.rate_frenzy <= (peak.frenzy||state.rate_frenzy)?state.rate_frenzy:peak.frenzy,

		bull_bear:state.trade_dir === "sell"?
			state.bull_bear >= (peak.bull_bear||state.bull_bear)?state.bull_bear:peak.bull_bear:
			state.bull_bear <= (peak.bull_bear||state.bull_bear)?state.bull_bear:peak.bull_bear,

		orders:state.trade_dir === "sell"?
			state.orders >= (peak.orders||state.orders)?state.orders:peak.orders:
			state.orders <= (peak.orders||state.orders)?state.orders:peak.orders,

		incline:state.trade_dir === "sell"?
			state.price_incline >= (peak.incline||state.price_incline)?state.price_incline:peak.incline:
			state.price_incline <= (peak.incline||state.price_incline)?state.price_incline:peak.incline,
	}
}
function peaked(){
	let sell = [
		peak.inertia >= 0 && peak.inertia - state.trade_inertia > limits.inertia[1],		
		peak.bull_bear >= 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1],
		peak.frenzy >= limits.frenzy[0] && peak.frenzy - state.rate_frenzy > limits.frenzy[1],
		peak.incline >= limits.incline[0] && peak.incline - state.price_incline > limits.incline[1],
		peak.orders >= 0 && peak.orders - state.orders > limits.orders[1]
	];
	let buy = [
		peak.inertia <= 0 && state.trade_inertia - peak.inertia > limits.inertia[1],		
		peak.bull_bear <= 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1],
		peak.frenzy <= limits.frenzy[0]*-1 && state.rate_frenzy - peak.frenzy > limits.frenzy[1],
		peak.incline <= limits.incline[0]*-1 && state.price_incline - peak.incline > limits.incline[1],
		peak.orders <= 0 && state.orders -peak.orders > limits.orders[1]
	]

	state.trade_dir === "sell"?
		state.peaked = sell.filter((foo)=>{return foo}).length >= sell.length-1:
		state.peaked = buy.filter((foo)=>{return foo}).length >= buy.length-1;
}