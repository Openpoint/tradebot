"use strict";

const fee = exports.fee = function(val){
	return val*(vars.expense/100);
}

const bid = exports.bid = function(val){
	if (state.trade_dir === 'buy'){
		val += fee(val);
		val += fee(val);
	}else{
		val -= fee(val);
		val -= fee(val);
	}
	return val;
}

const time = exports.time = function(T){
	return T?T*60:vars.minutes*60;
}

exports.timefilter = function(array,trade,T){
	
	let trigger = true;
	let i =0;
	while(i < array.length && trigger){
		if(array[i].timestamp > (trade.timestamp - time(T))){
			trigger = false;
		}else{
			i++;
		}		
	}
	return array.slice(i);
}

exports.flatten = function(data,dir){
	let len = data.length;
	let foo = {vol:0,price:0,weight:0};
	data.forEach((b)=>{
		let v = b[1]*1;
		let p = b[0]*1;
		foo.vol+=v;
		foo.price+=p;
	})
	Object.keys(foo).forEach((k)=>{
		foo[k] = foo[k]/len;
	})
	foo.dir = dir;
	return foo;	
}

exports.getItems = function(trade){
	return {
		trade:{
			timestamp:trade.timestamp*1000,
			price:trade.price,
			inertia:state.trade_inertia,
			momentum:state.price.momentum,			
			resistance:state.resistance,
			speed:{
				buy:state.rate.buy.speed,
				sell:state.rate.sell.speed,
				frenzy:state.rate.frenzy
			},
			//frequency:state.rate.frequency
			//frequency:state.warpspeed
			trend:state.price.trend,
			average:state.price.average,
			orders:state.order_inertia
		},
		order:{
			timestamp:trade.timestamp*1000,
			//volume:state.order_inertia.vol,
			//price:state.order_inertia.price,
			weight:state.order_inertia
		}
	}
}

exports.ratefilter = function(dir,t){
	if(dir === 'buy') return t.type?false:true;
	if(dir === 'sell') return t.type?true:false;
}

let Peak = 0;
let range = vars.smooth - vars.min_smooth;
exports.timeWarp = function(){
	state.warpspeed = 0;
	return vars.smooth;
	if(
		(state.price.momentum >= 0 && state.price.prev_momentum <= 0)||
		(state.price.momentum <= 0 && state.price.prev_momentum >= 0)
	) Peak = 0;
	let peak;
	if(state.trade_dir === 'buy'){
		peak = state.price.momentum >= 0?0:state.price.momentum*-1;

	}else{
		peak = state.price.momentum <= 0?0:state.price.momentum;
	}
	if(peak > Peak) Peak = peak;
	if(!Peak){
		state.warpspeed = vars.min_smooth+(range/2);
		return state.warpspeed;
	}

	//if(!Peak) return vars.min_smooth;
	
	let scale = range*(peak/Peak);
	state.warpspeed = vars.min_smooth + scale;
	//return vars.smooth - scale;
	return state.warpspeed;
}
exports.resetWarp = function(){
	Peak = 0;
}

const adjust = 1;
exports.timestamp = function(Time){
	let time = Time-(adjust*60*60);
	time = time*1000
	let date = new Date(time);
	let month =  date.getMonth()+1;
	if(month.toString().length < 2) month = '0'+month;
	let day = date.getDate();
	if(day.toString().length < 2) day = '0'+day;
	let hours = date.getHours();
	if(hours.toString().length < 2) hours = '0'+hours;
	let minutes = date.getMinutes();
	if(minutes.toString().length < 2) minutes = '0'+minutes;

	return day+'/'+month+' - '+hours+':'+minutes

}
