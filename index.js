"use strict";

const Pusher = require("pusher-js");
const pusher = new Pusher("de504dc5763aeef9ff52");

const tradesChannel = pusher.subscribe('live_trades');
const orderBookChannel = pusher.subscribe('order_book');

const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

const api_key = "5INScMF2zQGtxptLwaHfVtgMkFccf9ZP";
const api_secret = "F2TC3mxgkyEWe0jsWk2c4JH1noQ89Hce";
const user_id = "uayy7084";

const init_coin = 1;
const init_fiat = 0;
const startup_price = [];

let coin = init_coin;
let fiat = init_fiat;
//let ready = true;
let init = false;
let first_trade = false;
let order_book = [];
let start_time = 1*60000;
let trade_dir = "sell";
let trade_inertia = 0;
let prev_inertia = 0;
let peak_inertia = 0;
let last_price;
let active_price;
let prev_price = 0;

setTimeout(()=>{
	init = true;
},start_time)

const logfile = 'tradedata_two.txt';
if(fs.existsSync(logfile)) fs.unlinkSync(logfile);
const logger = fs.createWriteStream(logfile,{flags:'a'});

tradesChannel.bind('trade', function (data) {
    addTrade(data);
})

orderBookChannel.bind('data', function (data) {

    let bids = {vol:0,price:0};
    let asks = {vol:0,price:0};
    let average = {vol:0,price:0};
    let len = data.bids.length;
    const now = Date.now();

    data.bids.forEach((b)=>{
        bids.vol+=b[1]*1;
        bids.price+=b[0]*1;
    })
    data.asks.forEach((a)=>{
        asks.vol+=a[1]*1;
        asks.price+=a[0]*1;
    })
    bids.price = bids.price/len;
	asks.price = asks.price/len;
	order_book.push({
		vol:asks.vol-bids.vol,
		price:asks.price-bids.price
	})
	if(init) order_book.shift();
	order_book.forEach((order)=>{
		average.vol+=order.vol;
		average.price+=order.price;
	})
	//console.log("Order volume:"+(asks.vol-bids.vol),"Order price:"+(asks.price-bids.price));
	logger.write('orders|'+now+'|'+average.vol+'|'+average.price+'\n');
	/*
    let d = {
        timestamp:now,
        vol:asks.vol-bids.vol,
        price:asks.price-bids.price
    }
    order_book.push(d);
    order_book = order_book.filter((da)=>{
        if(da.timestamp < now - start_time) return false;
        average.vol += da.vol;
        average.price += da.price;
        return true;
    })
    average.vol = average.vol/order_book.length;
    average.price = average.price/order_book.length;
    if(init){
        console.log(average,trade_inertia);
        logger.write('orders|'+now+'|'+average.vol+'|'+average.price+'\n');
	}
	*/ 
})

function Fee(val){
    return val*(0.25/100);
}
function Bid(val){
    if (trade_dir === 'sell'){
        val += Fee(val);
        val += Fee(val);
    }else{
        val -= Fee(val);
        val -= Fee(val);
    }
    return val;
}
function checkProfit(dir,trade){
	//const inertia_bias = dir === 'sell'?4:2;
	const inertia_bias = 3;
    let fee;
    let bid;

    //if(!last_price && trade.average_inertia <= 0) return false;
    bid = Bid(last_price);
    
    console.log(
        'check '+dir+' profit:',
        'peak_i:'+peak_inertia/inertia_bias,
        'trade_i:'+trade_inertia,
        'ap:'+active_price,
        'lp:'+last_price,
        'bid:'+bid,
        dir==='sell'?peak_inertia/inertia_bias > trade_inertia:peak_inertia/inertia_bias < trade_inertia,
        dir==='sell'?!bid||active_price > bid:active_price < bid
    );
    logger.write(dir+'profit|'+Date.now()+'|'+peak_inertia/inertia_bias+'|'+bid+'\n');
    if(dir === 'sell' && peak_inertia/inertia_bias > trade_inertia && (!bid||active_price > bid)) return true;
    if(dir === 'buy' && peak_inertia/inertia_bias < trade_inertia && active_price < bid) return true;
    return false;
}
function doTrade(trade){
    if(!init) return;
    const Trade = trade;
    //ready = false;
    trade_dir === "sell"?sell(Trade):buy(Trade);    
}
function buy(trade){
	
    const profitable = checkProfit('buy',trade);
    if(!profitable){
        //ready = true;
        return;
	}
	first_trade = true;
    //getPrice().then((data)=>{       
        console.log('BUY');
        console.log(trade.price);
        console.log(trade);
        //console.log(data);   
        last_price = trade.price;
        //ready = true;
        fiat = fiat - (fiat*(.25/100)); 
        coin = fiat/trade.price;
        fiat = 0;  
        console.log('$'+fiat,'BTC:'+coin);
        logger.write('buy|'+Date.now()+'|'+trade.price+'|'+trade.amount+'|'+Bid(trade.price)+'\n')
        trade_dir = "sell";
        /* 
    },(err)=>{
        console.log(err);
        ready = true;
    })
    */
}
function sell(trade){
	
    const profitable = checkProfit('sell',trade);
    if(!profitable){
        //ready = true;
        return;
	}
	first_trade = true;
    //getPrice().then((data)=>{       
        console.log('SELL');
        console.log(trade.price);
        console.log(trade)
        //console.log(data);
        
        last_price = trade.price;
        //ready = true;
        fiat = trade.price * coin;
        fiat = fiat - (fiat*(.25/100));
        coin = 0;
        console.log('$'+fiat,'BTC:'+coin);
        logger.write('sell|'+Date.now()+'|'+trade.price+'|'+trade.amount+'|'+Bid(trade.price)+'\n');
        trade_dir = "buy";
    /*    
    },(err)=>{
        console.log(err);
        ready = true;
    })
    */
}
function addTrade(trade){
    const now = Date.now();
    let rate;
      
    trade.timestamp = now;
    active_price = trade.price;
	trade.inertia = prev_price?(trade.price - prev_price)*trade.amount:0;
	prev_price = trade.price;
	trade_inertia += trade.inertia;
	if(!first_trade){
		startup_price.push(trade.price);
		last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
		console.log("startup price:"+last_price)
	}
	/*
    if(live_trades.length){
        let prev_price = live_trades[live_trades.length-1].price;
        
    } else {
        trade.inertia = 0;
    }
    live_trades.push(trade);
    live_trades = live_trades.filter((t)=>{       
        if(t.timestamp < now - trade_window) {
            init = true;
            return false;
        }
        trade_inertia += t.inertia;
        return true;
	})
	*/
    trade.average_inertia = trade_inertia;
    if((prev_inertia > 0 && trade_inertia < 0)||(prev_inertia < 0 && trade_inertia > 0)){
        console.log('-------------------SWING----------------------------');
    }
    prev_inertia = trade_inertia;


	//rate = live_trades.length/(trade_window/60000);
	console.log(trade.price+' : '+trade_inertia+' : '+rate+'/minute');
	logger.write('trade|'+now+'|'+trade.price+'|'+trade_inertia+'|'+rate+'\n');
	
	if(trade_dir === 'sell' && trade_inertia > peak_inertia) peak_inertia = trade_inertia;
	if(trade_dir === 'buy' && trade_inertia < peak_inertia) peak_inertia = trade_inertia;

    if(init){	
		if((trade_dir === 'sell' && trade_inertia > 0)||(trade_dir === 'buy' && trade_inertia < 0)) doTrade(trade);
    }
    

}

function getPrice(){
    return new Promise((resolve,reject)=>{
        request('https://www.bitstamp.net/api/v2/ticker_hour/btcusd/',{json:true},(err, res, body) => {
            if (err) return reject(err);
            resolve(body);
        })
    })
}

//makeAuth();



function makeAuth(){
    const nonce = Date.now();
    const message = nonce+user_id+api_key;
    const hash = crypto.createHmac('sha256',api_secret).update(message).digest('hex').toUpperCase();
    const path = "https://www.bitstamp.net/api/v2/balance/";

    const params = {
        "nonce":nonce,
        "key":api_key,
        "signature":hash
    }

    //console.log(params.toJSON);

    const r = request.post(path,{
        json:true,
        form:params
    },(err, res, body) => {
        if (err) return console.log(err);
        console.log(body);
        //console.log(res.toJSON());
    })
    //console.log(r)
}
