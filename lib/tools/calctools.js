"use strict";

const scale = vars.smooth_short/vars.smooth;
let shortcount;
let shortprice;
let moment;
let frequency={
	buy:0,
	sell:0
}

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
	return T?T*60:vars.smooth_short*60;
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
			timestamp:trade.timestamp,
			price:trade.price,
			inertia:state.trade_inertia,
			momentum:state.price_momentum,
			speed:{
				buy:state.rate_buy_speed,
				sell:state.rate_sell_speed,
				frenzy:state.rate_frenzy
			},
			//frequency:state.rate.frequency
			//frequency:state.warpspeed
			trend:state.price_trend,
			average:state.price_average,
			orders:state.order_inertia,
			bull_bear:state.bull_bear,
			target:state.price_target_adjusted
		},
		order:{
			timestamp:trade.timestamp,
			weight:state.order_inertia
		}
	}
}


const adjust = 1;
const timestamp = exports.timestamp = function(Time,file){
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

	if(!file) return day+'/'+month+' - '+hours+':'+minutes
	return date.getFullYear().toString()+month.toString()+day.toString();

}
const State = exports.state = {};
exports.reset = function(rates){
	let dirs = ['buy','sell'];
	moment = 0;
	shortcount = 0;
	shortprice = 0;
	frequency={
		buy:0,
		sell:0
	}

	State.rate_long = 0;
	State.rate_short = 0;	
	State.price_momentum = 0;
	State.price_average = 0;
	State.price_trend = 0;
	State.trade_inertia = 0;
	dirs.forEach((dir)=>{
		State['rate_'+dir+'_short'] = 0;
		State['rate_'+dir+'_long'] = 0;
		State['rate_'+dir+'_speed'] = 0;
	})

	if(rates.length < 2) {
		state.start_time = false;
		state.ready = false;
		console.log(timestamp(rates[0].timestamp),rates.length)
	}
	if(state.first_trade){
		let emergency = (parseFloat(rates[rates.length-1].timestamp) - state.last_profit_time - vars.cut*60) > 0 &&
		state.trade_dir === 'sell'?
		state.price_target - state.price_short_average > vars.cut_limit:
		state.price_short_average - state.price_target > vars.cut_limit

		if(emergency){
			console.log('________________EMERGENCY_________________________');
			state.first_trade = false;
		}
	}
}

exports.speed = function(t,short){
	let type;
	if(t) type = t.type?'sell':'buy';
	if(t && !short){		
		State.rate_long+=t.amount;
		State['rate_'+type+'_long']+=t.amount;
	}else if(t && short){
		State.rate_short+=t.amount;
		State['rate_'+type+'_short']+=t.amount;
		frequency[type]++;
	}else{
		let dirs = ['buy','sell'];
		State.rate_speed = State.rate_short - State.rate_long*scale;
		dirs.forEach((dir)=>{
			State['rate_'+dir+'_speed'] = State['rate_'+dir+'_short'] - State['rate_'+dir+'_long']*scale;
		})
		dirs.forEach((dir)=>{
			//state.rate[dir].frenzy = state.rate[dir==='buy'?'sell':'buy'].speed - state.rate[dir].speed;
			State['rate_'+dir+'_frequency'] = frequency[dir];
		})
		State.rate_frenzy = State.rate_buy_speed - State.rate_sell_speed;
		State.rate_frequency = State.rate_buy_frequency - State.rate_sell_frequency;
	}
}

exports.price = function(t,short,length){
	if(t && !short && !length){		
		State.price_average+=t.price;
	}else if(t && short){
		shortcount++;
		shortprice+=t.price;
	}else{
		State.price_average = State.price_average/length;
		State.price_short_average = shortprice/shortcount;
		t.average = State.price_average;
		t.short_average = State.price_short_average;
		state.trade_dir === 'sell'?
		state.last_profit_time = State.price_short_average > state.price_target?parseFloat(t.timestamp):state.last_profit_time:
		state.last_profit_time = State.price_short_average < state.price_target?parseFloat(t.timestamp):state.last_profit_time
	}
}
exports.inertia = function(t,length){
	if(t){
		let type = t.type?'sell':'buy';
		let inert = t.price*t.amount
		inert = type==='sell'?inert*-1:inert;
		State.trade_inertia += inert;
	}else{
		State.trade_inertia = State.trade_inertia/length;
	}
}
exports.sentiment = function(rates,t,trade,i,length){
	if(t){
		if(!rates[i+1]) {
			moment = (t.price*t.amount) - (trade.price*trade.amount);
		}else{
			moment = (rates[i+1].price*rates[i+1].amount) - (t.price*t.amount);
		}	 
		//state.price.momentum+=1/t.price * moment;
		State.price_momentum+=moment;
	}else{
		State.bull_bear = State.price_short_average - (rates[0].short_average||State.price_short_average);
		State.price_trend = State.price_short_average - State.price_average;
		State.price_momentum = State.price_momentum/length;
		if(state.first_trade){
			state.trade_dir === 'sell'?
				state.price_target_adjusted = State.bull_bear > 0?
					state.price_target+State.bull_bear - State.rate_frenzy:
					state.price_target:
				state.price_target_adjusted = State.bull_bear < 0?
					state.price_target+State.bull_bear - State.rate_frenzy:
					state.price_target

			state.trade_dir === 'sell'?
				state.price_target_adjusted = state.price_target_adjusted > state.price_target?
					state.price_target_adjusted:
					state.price_target:
				state.price_target_adjusted = state.price_target_adjusted < state.price_target?
					state.price_target_adjusted:
					state.price_target

		}else{
			state.price_target_adjusted = state.price_target;
		}
	}
}
