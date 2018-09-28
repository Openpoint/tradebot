"use strict"

const limits = sauce.limits;

module.exports.Peak = function(peak,prev){
	if(state.trade_dir === "sell"){
		if(prev.sentiment <= -5 && state.sentiment > -5){
			peak.sentiment = state.sentiment;
		}
		
		if(prev.inertia <= -20 && state.trade_inertia > -20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.speed <= 0 && state.speed > 0){			
			peak.speed = state.speed;
		}
		if(prev.orders <= 0 && state.orders > 0){			
			peak.orders = state.orders;
		}
		if(prev.incline <= 0 && state.price_incline > 0){			
			peak.incline = state.price_incline;
		}	
	}else{
		if(prev.sentiment >= 5 && state.sentiment < 5){
			peak.sentiment = state.sentiment;
		}
		if(prev.inertia >= 20 && state.trade_inertia < 20){
			peak.inertia = state.trade_inertia;
		}
		if(prev.speed >= 0 && state.speed < 0){
			peak.speed = state.speed;
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

		speed:state.trade_dir === "sell"?
			state.speed >= (peak.speed||state.speed)?state.speed:peak.speed:
			state.speed <= (peak.speed||state.speed)?state.speed:peak.speed,

		sentiment:state.trade_dir === "sell"?
			state.sentiment >= (peak.sentiment||state.sentiment)?state.sentiment:peak.sentiment:
			state.sentiment <= (peak.sentiment||state.sentiment)?state.sentiment:peak.sentiment,

		orders:state.trade_dir === "sell"?
			state.orders >= (peak.orders||state.orders)?state.orders:peak.orders:
			state.orders <= (peak.orders||state.orders)?state.orders:peak.orders,

		incline:state.trade_dir === "sell"?
			state.price_incline >= (peak.incline||state.price_incline)?state.price_incline:peak.incline:
			state.price_incline <= (peak.incline||state.price_incline)?state.price_incline:peak.incline,
	}
}
module.exports.peaked = function(peak){
	let good = {
		sell:{
			speed:
				peak.speed >= limits.speed[0] && 
				peak.speed - state.speed > limits.speed[1],
			incline:
				peak.incline >= limits.incline[0] && 
				peak.incline - state.price_incline > limits.incline[1] && 
				state.price_incline > 0,
			orders:
				peak.orders >= limits.orders[0] && 
				peak.orders - state.orders > limits.orders[1],
			inertia:
				peak.inertia >= limits.inertia[0] && 
				peak.inertia - state.trade_inertia > limits.inertia[1],
			sentiment:
				peak.sentiment >= limits.sentiment[0] && 
				peak.sentiment - state.sentiment > limits.sentiment[1]
		},
		buy:{
			speed:
				peak.speed <= limits.speed[0]*-1 && 
				state.speed - peak.speed > limits.speed[1],
			incline:
				peak.incline <= limits.incline[0]*-1 && 
				state.price_incline - peak.incline > limits.incline[1] && 
				state.price_incline < 0,
			orders:
				peak.orders <= limits.orders[0]*-1 && 
				state.orders -peak.orders > limits.orders[1],
			inertia:
				peak.inertia <= limits.inertia[0]*-1 && 
				state.trade_inertia - peak.inertia > limits.inertia[1],
			sentiment:
				peak.sentiment <= limits.sentiment[0]*-1 && 
				state.sentiment -peak.sentiment > limits.sentiment[1]
		}
	}
	good = good[state.trade_dir];
	state.debug.peaks = {
		dir:state.trade_dir,
		inertia:[peak.inertia,good.inertia],
		sentiment:[peak.sentiment,good.sentiment],
		speed:[peak.speed,good.speed],
		orders:[peak.orders,good.orders],
		incline:[peak.incline,good.incline]
	}
	state.peaked = ([
		good.inertia,
		good.sentiment,
		good.orders,
		good.incline,
		good.speed
	].filter((foo)=>{return foo}).length > 3)
	/*
	state.trade_dir === "sell"?
		state.peaked = (sell.filter((foo)=>{return foo}).length >= sell.length-1):
		state.peaked = (buy.filter((foo)=>{return foo}).length >= buy.length-1);
	*/
}