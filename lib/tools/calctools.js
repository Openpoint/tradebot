"use strict";

const scale = vars.smooth_short/vars.smooth;
let shortcount;
let shortprice;
let moment;
let frequency={
	buy:0,
	sell:0
}
exports.expense = function(vol){
	if(vol < 20000){
		vars.expense = 0.25;
		return;
	}
	if(vol < 100000){
		vars.expense = 0.24;
		return;
	}
	if(vol < 200000){
		vars.expense = 0.22;
		return;
	}
	if(vol < 400000){
		vars.expense = 0.20;
		return;
	}
	if(vol < 600000){
		vars.expense = 0.15;
		return;
	}
	if(vol < 1000000){
		vars.expense = 0.14;
		return;
	}
	if(vol < 2000000){
		vars.expense = 0.13;
		return;
	}
	if(vol < 4000000){
		vars.expense = 0.12;
		return;
	}
	if(vol < 20000000){
		vars.expense = 0.11;
		return;
	}
	if(vol >= 20000000){
		vars.expense = 0.10;
	}
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
	return Math.round(val*100)/100;
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

exports.flatten = function(data){
	let len = data.length;
	let foo = {vol:0,price:0};
	data.forEach((b)=>{
		let v = b[1]*1;
		let p = b[0]*1;
		foo.vol+=v;
		foo.price+=p;
	})
	Object.keys(foo).forEach((k)=>{
		foo[k] = foo[k]/len;
	})
	return foo;
}

exports.getItems = function(trades){
	let trade = {};
	trades.forEach((t)=>{
		Object.keys(t).forEach((k)=>{
			if(k === 'type') return;
			if(!trade[k]) trade[k] = 0;
			trade[k] += t[k];
		})
	})
	Object.keys(trade).forEach((k)=>{
		trade[k] = trade[k]/trades.length;
	})

	return {
		trade:{
			timestamp:Math.round(trade.timestamp),
			price:Math.round(trade.price*100)/100,
			inertia:state.trade_inertia,
			speed:{
				buy:state.rate_buy_speed,
				sell:state.rate_sell_speed,
				frenzy:state.rate_frenzy,
				incline:state.price_incline
			},
			//trend:state.price_trend,
			average:state.price_average,
			orders:state.orders,
			bull_bear:state.bull_bear,
			target:state.price_target,
			peaks:state.peaks,
			peaked:(state.peaked?1:-1),
			
		}
	}
}


const adjust = 0;
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
let State = {};
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
	//State.price_trend = 0;
	State.trade_inertia = 0;
	dirs.forEach((dir)=>{
		State['rate_'+dir+'_short'] = 0;
		State['rate_'+dir+'_long'] = 0;
		State['rate_'+dir+'_speed'] = 0;
	})

	if(!state.emergency && state.first_trade){
		let emergency = state.trade_dir === 'sell'?
			(parseFloat(rates[rates.length-1].timestamp) - state.last_profit_time - vars.cut*60) > 0 && 
			(state.price_short_average - state.price_target)*-1 > vars.cut_limit:
			
			(parseFloat(rates[rates.length-1].timestamp) - state.last_profit_time - vars.cut*60) > 0 && 
			state.price_short_average - state.price_target > vars.cut_limit

		if(emergency){
			Log.info('________________EMERGENCY '+timestamp(rates[rates.length-1].timestamp));
			state.emergency = true;
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
		state.rate_sell_speed = State.rate_sell_speed;
		state.rate_buy_speed = State.rate_buy_speed;
		state.rate_frenzy = State.rate_sell_speed - State.rate_buy_speed;
		state.rate_frequency = State.rate_buy_frequency - State.rate_sell_frequency;
	}
}

exports.price = function(t,short,length){
	if(t && !short && !length){		
		State.price_average+=t.price;
	}else if(t && short){
		shortcount++;
		shortprice+=t.price;
	}else{
		state.price_average = State.price_average/length;
		state.price_short_average = shortprice/shortcount;
		t.average = state.price_average;
		t.short_average = state.price_short_average;
		state.trade_dir === 'sell'?
			state.last_profit_time = state.price_short_average > state.price_target?parseFloat(t.timestamp):state.last_profit_time:
			state.last_profit_time = state.price_short_average < state.price_target?parseFloat(t.timestamp):state.last_profit_time
	}
}
exports.inertia = function(t,length){

	if(t){
		let type = t.type?'sell':'buy';
		let inert = t.vol//t.price*t.amount
		inert = type==='sell'?inert*-1:inert;
		State.trade_inertia += inert;
	}else{
		state.trade_inertia = State.trade_inertia/length;
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
		state.price_momentum+=moment;
	}else{
		state.bull_bear = state.price_short_average - (rates[0].short_average||state.price_short_average);
		//State.price_trend = State.price_short_average - State.price_average;
		state.price_momentum = state.price_momentum/length;

	}
}
exports.orders = function(order_book){
	state.orders = order_book.reduce((a,b)=>{
		//??.weight is a legacy of old recorder logic.
		let buy = b.bids.weight?b.bids.weight/b.bids.price:b.bids.vol;
		let sell = b.asks.weight?b.asks.weight/b.asks.price:b.asks.vol;
		let order = buy - sell;
		return a+(order);
	},0)/(order_book.length);
}
exports.incline = function(data){
	let lowest;
	let highest;
	let range;
	data.forEach((p,i)=>{
		if(!lowest) lowest = [p,i];
		if(!highest) highest = [p,i];
		if(p < lowest[0]) lowest = [p,i];
		if(p > highest[0]) highest = [p,i];
	})
	lowest[1] < highest[1]?range = [lowest[0],highest[0]]:range = [highest[0],lowest[0]];
	state.price_incline = Math.round((range[1] - range[0])*100)/100;
}