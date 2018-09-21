"use strict"

const Calc = require('./calc.js');
const File = require('./files.js');
const tools = require('./tools/calctools.js');

let peak = {};
let prev = {
	price:0,
	bull_bear:0,
	frenzy:0,
	inertia:0,
	orders:0
}
/*
const glutlimit = {
	//inertia:[8000,2000],
	//bull_bear:[300,50],
	inertia:[5250,1000],
	bull_bear:[185,100],
	orders:[0,0.6],
	frenzy:[0,35]
}
const limits = {
	profitable:[3,20],	
	//bull_bear:[40,30],
	bull_bear:[20,10],	
	inertia:[1800,1000],
	frenzy:[60,20],
	orders:[1.5,0.3]
}
*/
const glutlimit = {
	//inertia:[8000,2000],
	//bull_bear:[300,50],
	inertia:[5250,1000],
	bull_bear:[185,100],
	orders:[0,0.6],
	frenzy:[0,35]
}
const limits = {
	profitable:[3,20],	
	//bull_bear:[40,30],
	bull_bear:[20,10],	
	inertia:[1800,1000],
	frenzy:[60,20],
	orders:[1.5,0.3]
}
const stages = Object.keys(limits);

module.exports.addTrade = function(trade){	
	
	if(!prepare(trade)) return;

	
	const check = new Check();
	if(check.init(trade)){
		if(state.doldrum||state.glut){
			console.log(tools.timestamp(trade.timestamp)+' Doldrum:'+state.doldrum+' Glut:'+state.glut);
			reset(trade);
		}else{
			reset(trade);
		}		
	}
	prev = {
		price:trade.price,
		bull_bear:state.bull_bear,
		frenzy:state.rate_frenzy,
		inertia:state.trade_inertia,
		orders:state.orders
	}
}

function Check(){
	let good;
	this.init = function(trade){

		peak = state.peaks = Peak(trade);

		if(!state.ready){
			return false;
		}		
		peaked(trade)
		if(this[stages[0]](trade)){
			this.glut(trade);
			
			//if(state.doldrum) console.log(tools.timestamp(trade.timestamp),state.trade_inertia,state.bull_bear);
			if(!state.peaked){
				good = false;
			}else{
				good = [
					this[stages[1]](trade),
					this[stages[2]](trade),
					state.glut||state.doldrum?
						this[stages[3]](trade)&&this[stages[4]](trade):	
						this[stages[3]](trade)||this[stages[4]](trade)									
				];
				//console.log(tools.timestamp(trade.timestamp),good," Doldrum:"+state.doldrum," Glut:"+state.glut);
				good = good.filter((foo)=>{return foo}).length >= good.length;
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
		state.trade_inertia < glutlimit.inertia[1] && state.trade_inertia > glutlimit.inertia[1]*-1,
		state.bull_bear < glutlimit.bull_bear[1] && state.bull_bear > glutlimit.bull_bear[1]*-1,
		state.orders < glutlimit.orders[1] && state.orders > glutlimit.orders[1]*-1 &&
		state.rate_frenzy < glutlimit.frenzy[1] && state.rate_frenzy > glutlimit.frenzy[1]*-1
	]
	const doldrum = (dd[0] && dd[1])||(dd[0] && dd[2])||(dd[1] && dd[2]);
	state.doldrum = doldrum;
	/*
	state.trade_dir === 'sell'?
		state.doldrum = trade.price <= state.price_average && doldrum:
		state.doldrum = trade.price >= state.price_average && doldrum
	
	state.doldrum = 
		state.trade_inertia < glutlimit.inertia[1] && 
		state.trade_inertia > glutlimit.inertia[1]*-1 &&
		state.bull_bear < glutlimit.bull_bear[1] &&
		state.bull_bear > glutlimit.bull_bear[1]*-1 //&&
		//state.orders < glutlimit.orders &&
		//state.orders > glutlimit.orders*-1 &&
		//state.rate_frenzy < glutlimit.frenzy &&
		//state.rate_frenzy > glutlimit.frenzy*-1
	*/
}
Check.prototype.profitable = function(trade){	
	const profit = state.trade_dir === 'sell'?
		trade.price > state.price_target_adjusted &&
		//trade.price > state.price_average &&
		//trade.price > state.price_average+limits.profitable[1] && 
		trade.price < prev.price + limits.profitable[0]:

		trade.price < state.price_target_adjusted &&
		//trade.price < state.price_average &&
		//trade.price < state.price_average-limits.profitable[1] && 
		trade.price > prev.price - limits.profitable[0];
	if(profit){
		/*
		if(state.trade_dir === 'sell'){
			if(trade.price - state.price_average > state.bull_bear)return true;
		}else{
			console.log(tools.timestamp(trade.timestamp),state.price_average - trade.price,state.bull_bear*-1)
			if(state.price_average - trade.price < state.bull_bear*-1) return true
		}
		*/
		//return this[stages[1]](trade);
		return true;
	};
	return false;
}
Check.prototype.bull_bear = function(trade){
	let glut = state.glut||state.doldrum;
	const bull_bear = state.trade_dir === 'sell'?
		//peak.bull_bear > limits.bull_bear[0] && state.bull_bear > limits.bull_bear[0]*-1:
		//peak.bull_bear < limits.bull_bear[0]*-1 && state.bull_bear < limits.bull_bear[0]
		peak.bull_bear > limits.bull_bear[0] && state.bull_bear > (glut?limits.bull_bear[1]*-1:peak.bull_bear*-1):
		peak.bull_bear < limits.bull_bear[0]*-1 && state.bull_bear < (glut?limits.bull_bear[1]:peak.bull_bear*-1)
	/*
	state.trade_dir === 'sell'?
		limits.inertia[0] = state.bull_bear:
		limits.inertia[0] = state.bull_bear*-1
	*/
	if(bull_bear){
		//return this[stages[2]](trade);
		return true;
	};
	return false;
}


Check.prototype.inertia = function(trade){
	let glut = state.glut||state.doldrum;
	const inertia = state.trade_dir === 'sell'?
		//peak.inertia > limits.inertia[0] && (state.doldrum?state.trade_inertia > 0:state.trade_inertia > limits.inertia[0]*-1):
		//peak.inertia < limits.inertia[0]*-1 && (state.doldrum?state.trade_inertia < 0:state.trade_inertia < limits.inertia[0])
		peak.inertia > limits.inertia[0] && state.trade_inertia > (glut?limits.inertia[1]*-1:peak.inertia*-1):
		peak.inertia < limits.inertia[0]*-1 && state.trade_inertia < (glut?limits.inertia[1]:peak.inertia*-1)
	/*
	const inertia = state.trade_dir === 'sell'?
	state.trade_inertia > limits.inertia[0] && peaked():
	state.trade_inertia < limits.inertia[0]*-1  && peaked()
	*/
	if(inertia){
		//return this[stages[3]](trade);
		return true;
	}
	return false;
}

Check.prototype.frenzy = function(trade){
	let glut = state.glut||state.doldrum;
	const frenzy =  state.trade_dir === 'sell'?
		//peak.frenzy > limits.frenzy[0] && (state.doldrum?state.rate_frenzy > 0:state.rate_frenzy > limits.frenzy[0]*-1):
		//peak.frenzy < limits.frenzy[0]*-1  && (state.doldrum?state.rate_frenzy < 0:state.rate_frenzy < limits.frenzy[0])
		peak.frenzy > limits.frenzy[0] && state.rate_frenzy > (glut?limits.frenzy[1]*-1:peak.frenzy*-1):
		peak.frenzy < limits.frenzy[0]*-1 && state.rate_frenzy < (glut?limits.frenzy[1]:peak.frenzy*-1)
	if(frenzy){
		return true;
	}

	return false;
}
Check.prototype.orders = function(trade){
	let glut = state.glut||state.doldrum;
	const orders =  state.trade_dir === 'sell'?
		//peak.orders >= limits.orders[0] && state.orders > limits.orders[0]*-1:
		//peak.orders <= limits.orders[0]*-1 && state.orders < limits.orders[0]
		peak.orders >= limits.orders[0] && state.orders > (glut?limits.orders[1]*-1:peak.orders *-1):
		peak.orders <= limits.orders[0]*-1 && state.orders < (glut?limits.orders[1]:peak.orders *-1)
	if(orders){
		return true;
	}

	return false;
}

//let buffer = {};
let times = [];
//let bigtime = 0;
let trades = {0:[],1:[]};

function prepare(trade){
	trade.timestamp = parseFloat(trade.timestamp);
	if(!state.start_time) state.start_time = trade.timestamp;
	if(state.start_time < trade.timestamp - tools.time(vars.smooth)) state.ready = true;

	//Calc.startprice(trade);
	//Calc.rate(trade);
	trades[trade.type].push(trade);
	times.push(parseFloat(trade.timestamp));
	//if(!buffer.price) buffer.price=0;
	//buffer.price+=trade.price;
	//bigtime += parseFloat(trade.timestamp);
	/*
	const keys = Object.keys(tools.state);
	for(let i=0;i<keys.length;i++){
		const k = keys[i]
		if(!buffer[k]) buffer[k]=0;
		buffer[k]+=tools.state[k];
	}
	*/
	if(parseFloat(trade.timestamp) - times[0] > 30){
		/*
		trade.timestamp = Math.round(bigtime/times.length);
		trade.price = Math.round(buffer.price/times.length*100)/100;
		for(let i=0;i<keys.length;i++){
			const k = keys[i];
			state[k] = buffer[k]/times.length;
		}
		*/
		let newtrades = [{},{}];
		Object.keys(trades).forEach((k)=>{
			trades[k].forEach((t)=>{
				Object.keys(t).forEach((k2)=>{
					if(k2 === 'type'){
						newtrades[k][k2] = k*1;
						return;
					}
					if(!newtrades[k][k2]) newtrades[k][k2] = 0;
					newtrades[k][k2] += t[k2]
				})
			})
		})

		newtrades.forEach((t,i)=>{
			if(!t.timestamp) return;
			t.timestamp = Math.round(t.timestamp/trades[i].length);			
			t.price = t.price/trades[i].length;
			t.vol = t.price*t.amount;
		})
		newtrades = newtrades.filter((t)=>{
			return Object.keys(t).length > 0;
		}).sort((a,b)=>{
			return a.timestamp - b.timestamp;
		})
		newtrades.forEach((trade)=>{
			Calc.startprice(trade);
			Calc.rate(trade);
		})
		
		state.price_average = Math.round(state.price_average*100)/100;
		state.price_short_average = Math.round(state.price_short_average*100)/100;
		//state.price_trend = Math.round(state.price_trend*10)/10;
		state.trade_inertia = Math.round(state.trade_inertia);
		state.rate_frenzy = Math.round(state.rate_frenzy*10)/10;
		state.bull_bear = Math.round(state.bull_bear);
		state.orders = Math.round(state.orders*100)/100


		const items = Calc.getItems(newtrades);	
		if(!state.ready) items.trade.noready = true;
		File.goWrite('trade',items.trade);			
		if(!state.loading) web.emit('trade',items.trade);

		trades = {0:[],1:[]};
		times = [];
		return true;
	}
	return false;

}

function Peak(trade){
	if(state.trade_dir === "sell"){
		if(prev.bull_bear <= -5 && state.bull_bear > -5){
			peak.bull_bear = state.bull_bear;
		}
		
		if(prev.inertia <= -20 && state.trade_inertia > -20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.frenzy <=0 && state.rate_frenzy >0){			
			peak.frenzy = state.rate_frenzy;
		}
		if(prev.orders <=0 && state.orders >0){			
			peak.orders = state.orders;
		}	
	}else{
		if(prev.bull_bear >= 5 && state.bull_bear < 5){
			peak.bull_bear = state.bull_bear;
		}
		if(prev.inertia >= 20 && state.trade_inertia < 20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.frenzy >= 0 && state.rate_frenzy <0){
			peak.frenzy = state.rate_frenzy;
		}
		if(prev.orders >= 0 && state.orders <0){
			peak.orders = state.orders;
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
	}
}
function peaked(trade){
	let sell = [
		peak.inertia >= 0 && peak.inertia - state.trade_inertia > limits.inertia[1],		
		peak.bull_bear >= 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1],
		peak.frenzy >= limits.frenzy[0] && peak.frenzy - state.rate_frenzy > limits.frenzy[1],
		peak.orders >= 0 && peak.orders - state.orders > limits.orders[1]
	];
	let buy = [
		peak.inertia <= 0 && state.trade_inertia - peak.inertia > limits.inertia[1],		
		peak.bull_bear <= 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1],
		peak.frenzy <= limits.frenzy[0]*-1 && state.rate_frenzy - peak.frenzy > limits.frenzy[1],
		peak.orders <= 0 && state.orders -peak.orders > limits.orders[1]
	]
	/*
	console.log(
		tools.timestamp(trade.timestamp),state.trade_dir === "sell"?sell:buy
	)
	*/
	//let limit = 3;//state.first_trade?2:1;
	state.trade_dir === "sell"?
		state.peaked = sell.filter((foo)=>{return foo}).length >= sell.length:
		state.peaked = buy.filter((foo)=>{return foo}).length >= buy.length;
		/*
		(peak.inertia > 0 && peak.inertia - state.trade_inertia > limits.inertia[1]) && (
			(peak.frenzy > 0 && peak.frenzy - state.rate_frenzy > limits.frenzy[1]) ||
			(peak.bull_bear > 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1])
		) && (
			state.glut?peak.bull_bear > 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1]:true
			//peak.bull_bear > 0 && peak.bull_bear - state.bull_bear > limits.bull_bear[1]
		):
		(peak.inertia < 0 && state.trade_inertia - peak.inertia > limits.inertia[1]) && (
			(peak.frenzy < 0 && state.rate_frenzy - peak.frenzy > limits.frenzy[1]) ||
			(peak.bull_bear < 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1])
		) && (
			state.glut?peak.bull_bear < 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1]:true
			//peak.bull_bear < 0 && state.bull_bear -peak.bull_bear > limits.bull_bear[1]
		)
		*/
}

function reset(trade){
	peak = {
		inertia:state.trade_inertia,
		frenzy:state.rate_frenzy,
		bull_bear:state.bull_bear,
		orders:state.orders
	};
	//File.goWrite('trade',items.trade);
	state.last_price = trade.price;
	state.price_target = Math.round(tools.bid(state.last_price)*100)/100;
	const item = Calc.wallet(trade);
	if(!state.loading) web.emit('buysell',item);
	File.goWrite('buysell',item);
	state.trade_dir = state.trade_dir === "sell"?"buy":"sell";
	
}