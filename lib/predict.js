"use strict"

const Calc = require('./calc.js');
const File = require('./files.js');
const tools = require('./tools/calctools.js');

let peak = {};
let glut = false;
let prev_price = 0;
let prev;
const glut_limit = {
	inertia:200,
	bull_bear:40
}
const limits = {	
	bull_bear:[0,5],
	profitable:[3],	
	inertia:[0,50],
	frenzy:[20,10],	
}
const stages = Object.keys(limits);

module.exports.addTrade = function(trade){	
	prev = {
		price:trade.price,
		bull_bear:state.bull_bear,
		frenzy:state.rate_frenzy,
		inertia:state.trade_inertia
	}	
	const items = prepare(trade);
	if(!items) return;
	const check = new Check();
	if(check.init(trade)){
		reset(trade,items);
	}else{
		File.goWrite('trade',items.trade);
	}
}

function Check(){
	this.init = function(trade){
		if(!state.ready){
			prev = false;
			return false;
		}		
		peak = Peak(trade);
		Glut(trade);			
		const good = this[stages[0]](trade);
		prev_price = trade.price;
		if(state.trade_dir === 'sell'){
			if(
				prev.frenzy < 0 && state.rate_frenzy > 0 ||
				prev.bull_bear < 0 && state.bull_bear > 0
			){
				peak.inertia = state.trade_inertia;
				peak.bull_bear = state.bull_bear;
			}
		}else{
			if(
				prev.frenzy > 0 && state.rate_frenzy < 0 ||
				prev.bull_bear > 0 && state.bull_bear < 0
			){
				peak.inertia = state.trade_inertia;
				peak.bull_bear = state.bull_bear;
			}
		}

		return good;
	}
}
Check.prototype.bull_bear = function(trade){
	const bull_bear = state.trade_dir === 'sell'?
	state.bull_bear > limits.bull_bear[0] && prev.bull_bear > 0 && peaked():
	state.bull_bear < limits.bull_bear[0]*-1 && prev.bull_bear < 0 && peaked()

	state.trade_dir === 'sell'?
	limits.inertia[0] = state.bull_bear:
	limits.inertia[0] = state.bull_bear*-1

	if(bull_bear){
		return this[stages[1]](trade);
	};
	return false;
}
Check.prototype.profitable = function(trade){	
	const profit = state.trade_dir === 'sell'?
		trade.price > state.price_target_adjusted && 
		trade.price > state.price_average && 
		trade.price < prev_price + limits.profitable[0]:
		trade.price < state.price_target_adjusted && 
		trade.price < state.price_average && 
		trade.price > prev_price - limits.profitable[0];
	if(profit){
		return this[stages[2]](trade);
	};
	return false;
}

Check.prototype.inertia = function(trade){
	const inertia = state.trade_dir === 'sell'?
	state.trade_inertia > limits.inertia[0] && peaked():
	state.trade_inertia < limits.inertia[0]*-1  && peaked()
	/*
	state.trade_dir === 'sell'?
	console.log(peak.inertia - state.trade_inertia):
	console.log(state.trade_inertia - peak.inertia)
	*/
	if(inertia){
		return this[stages[3]](trade);
	}
	return false;
}

Check.prototype.frenzy = function(trade){
	const frenzy =  state.trade_dir === 'sell'?
		state.rate_frenzy >= limits.frenzy[0] && prev.frenzy > 0 && peaked():
		state.rate_frenzy <= limits.frenzy[0]*-1 && prev.frenzy < 0 && peaked()
	if(frenzy){
		return true;
	}

	return false;
}





let buffer = {};
let times = [];
let bigtime = 0;
function prepare(trade){
	if(!state.start_time) state.start_time = trade.timestamp;
	if(state.start_time < trade.timestamp - tools.time(vars.smooth)) state.ready = true;
	Calc.startprice(trade);
	Calc.rate(trade);

	times.push(parseFloat(trade.timestamp));
	if(!buffer.price) buffer.price=0;
	buffer.price+=trade.price;
	bigtime += parseFloat(trade.timestamp);

	const keys = Object.keys(tools.state);
	for(let i=0;i<keys.length;i++){
		const k = keys[i]
		if(!buffer[k]) buffer[k]=0;
		buffer[k]+=tools.state[k];
	}

	if(parseFloat(trade.timestamp) - times[0] > 60){

		trade.timestamp = Math.round(bigtime/times.length);
		trade.price = Math.round(buffer.price/times.length*100)/100;
		for(let i=0;i<keys.length;i++){
			const k = keys[i];
			state[k] = buffer[k]/times.length;
		}
		
		state.price_average = Math.round(state.price_average*100)/100;
		state.price_short_average = Math.round(state.price_short_average*100)/100;
		state.price_trend = Math.round(state.price_trend*10)/10;
		state.trade_inertia = Math.round(state.trade_inertia*10)/10;
		state.rate_frenzy = Math.round(state.rate_frenzy*10)/10;
		state.bull_bear = Math.round(state.bull_bear*10)/10;

		const items = Calc.getItems(trade);
		if(!state.ready) items.trade.noready = true;
		if(!state.loading) web.emit('trade',items.trade);
		buffer = {};
		times = [];
		bigtime = 0;
		return items;
	}
	return false;

}

function Peak(trade){
	return {
		//price:state.trade_dir === "sell"?
		//(trade.price >= (peak.price||trade.price)?trade.price:peak.price):
		//(trade.price <= (peak.price||trade.price)?trade.price:peak.price),

		trend:state.trade_dir === "sell"?
		state.price_trend > 0?(state.price_trend >= (peak.trend||state.price_trend)?state.price_trend:peak.trend):0:
		state.price_trend < 0?(state.price_trend <= (peak.trend||state.price_trend)?state.price_trend:peak.trend):0,

		inertia:state.trade_dir === "sell"?
		state.trade_inertia > 0?(state.trade_inertia >= (peak.inertia||state.trade_inertia)?state.trade_inertia:peak.inertia):0:
		state.trade_inertia < 0?(state.trade_inertia <= (peak.inertia||state.trade_inertia)?state.trade_inertia:peak.inertia):0,

		frenzy:state.trade_dir === "sell"?
		state.rate_frenzy > 0?(state.rate_frenzy >= (peak.frenzy||state.rate_frenzy)?state.rate_frenzy:peak.frenzy):0:
		state.rate_frenzy < 0?(state.rate_frenzy <= (peak.frenzy||state.rate_frenzy)?state.rate_frenzy:peak.frenzy):0,

		bull_bear:state.trade_dir === "sell"?
		state.bull_bear > 0?(state.bull_bear >= (peak.bull_bear||state.bull_bear)?state.bull_bear:peak.bull_bear):0:
		state.bull_bear < 0?(state.bull_bear <= (peak.bull_bear||state.bull_bear)?state.bull_bear:peak.bull_bear):0,
	}
}
function peaked(){
	return state.trade_dir === "sell"?
		(peak.inertia > 0 && peak.inertia - state.trade_inertia > limits.inertia[1]) && (
			(peak.frenzy > 0 && peak.frenzy - state.rate_frenzy > limits.frenzy[1]) ||
			(peak.bull_bear > 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1])
		) && (
			glut?peak.bull_bear > 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1]:true
		):
		(peak.inertia < 0 && state.trade_inertia - peak.inertia > limits.inertia[1]) && (
			(peak.frenzy < 0 && state.rate_frenzy - peak.frenzy > limits.frenzy[1]) ||
			(peak.bull_bear < 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1])
		) && (
			glut?peak.bull_bear < 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1]:true
		)
}
function Glut(trade){
	glut = state.trade_dir === 'sell'?
		peak.inertia > glut_limit.inertia && peak.bull_bear > glut_limit.bull_bear:
		peak.inertia < glut_limit.inertia*-1 && peak.bull_bear < glut_limit.bull_bear*-1
}
function reset(trade,items){
	peak = {};
	File.goWrite('trade',items.trade);
	state.last_price = trade.price;
	state.price_target = Math.round(tools.bid(state.last_price)*100)/100;
	const item = Calc.wallet(trade);
	if(!state.loading) web.emit('buysell',item);
	File.goWrite('buysell',item);
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
}