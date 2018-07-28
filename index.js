"use strict";

const History = require('./recorder/getter.js');
const path = require('path');
const LZString = require('lz-string');
const fs = require('fs');
if(!fs.existsSync('settings.json')){
	fs.createReadStream('./settings_temp.json').pipe(fs.createWriteStream('./settings.json'));
	console.log("Please fill in account details in <root>/settings.json, then start the application")
	return;
}


const Pusher = require("pusher-js");
const pusher = new Pusher("de504dc5763aeef9ff52");

const tradesChannel = pusher.subscribe('live_trades');
const orderBookChannel = pusher.subscribe('order_book');


const crypto = require('crypto');
const request = require('request');

const settings = require('./settings.json');
const api_key = settings.markets.bitstamp.api_key;
const api_secret = settings.markets.bitstamp.api_secret;
const user_id = settings.markets.bitstamp.user_id;

const init_coin = 1;
const init_fiat = 0;
const startup_price = [];
const inertias = [];

let coin = init_coin;
let fiat = init_fiat;
//let ready = true;
let init = true;
let first_trade = false;
let order_book = [];
let start_time = 1*60000;
let trade_dir = "sell";
let trade_inertia = 0;
let prev_inertia = 0;
let peak_inertia = 0;

let last_price;
let active_price;
//let prev_price = 0;


setTimeout(()=>{
	init = true;
},start_time)

const logfile = path.join(__dirname,settings.datafile);
if(fs.existsSync(logfile)) fs.unlinkSync(logfile);
const logger = fs.createWriteStream(logfile,{
	flags:'a',
	encoding:'ucs2'
});

const history = History();

history.orders.forEach((order)=>{
    addOrder(order);
})
history.trades.forEach((trade)=>{
    addTrade(trade);
})
const io = require('./graphserver.js');
tradesChannel.bind('trade', function (data) {
    addTrade(data);
})

orderBookChannel.bind('data', function (data) {
    addOrder(data);
})
function write(type,data){
	let json = {};
    json[type] = data;
    try{
        json = JSON.stringify(json);
    }
    catch(e){
        return;
    }
    logger.write(LZString.compress(json)+'\n');
    //logger.write(JSON.stringify(json)+'\n');
}
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
	//logger.write(dir+'profit|'+(trade.timestamp*1000)+'|'+peak_inertia/inertia_bias+'|'+bid+'\n');
	write(dir+'profit',{
		timestamp:trade.timestamp*1000,
		resistance:peak_inertia/inertia_bias,
		target:bid
	})
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
		//logger.write('buy|'+(trade.timestamp*1000)+'|'+trade.price+'|'+trade.amount+'|'+Bid(trade.price)+'\n');
		write('buy',{
			timestamp:trade.timestamp*1000,
			price:trade.price,
			volume:trade.amount,
			target:Bid(trade.price)
		})
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
		//logger.write('sell|'+(trade.timestamp*1000)+'|'+trade.price+'|'+trade.amount+'|'+Bid(trade.price)+'\n');
		write('sell',{
			timestamp:trade.timestamp*1000,
			price:trade.price,
			volume:trade.amount,
			target:Bid(trade.price)
		})
        trade_dir = "buy";
    /*    
    },(err)=>{
        console.log(err);
        ready = true;
    })
    */
}
function addOrder(data){

    let bids = {vol:0,price:0,weight:0};
    let asks = {vol:0,price:0,weight:0};
    let average = {vol:0,price:0,weight:0};
    let blen = data.bids.length;
    let alen = data.asks.length;
    const now = data.timestamp*1000;

    data.bids.forEach((b)=>{
        let v = b[1]*1;
        let p = b[0]*1;
        bids.vol+=v;
        bids.price+=p;
        bids.weight = p*v;
    })
    data.asks.forEach((a)=>{
        let v = a[1]*1;
        let p = a[0]*1;
        asks.vol += v;
        asks.price += p;
        asks.weight = p*v;
    })
    bids.price = bids.price/blen;
    bids.weight = bids.weight/blen;
    asks.price = asks.price/alen;
    asks.weight = asks.weight/alen;

	order_book.push({
		vol:Math.round(bids.vol-asks.vol),
        price:Math.round(bids.price-asks.price),
        weight:Math.round(bids.weight-asks.weight)
	})
	if(order_book.length > (10*60)) order_book.shift();
	order_book.forEach((order)=>{
		average.vol += order.vol;
        average.price += order.price;
        average.weight += order.weight;
	})
	//console.log("Order volume:"+(asks.vol-bids.vol),"Order price:"+(asks.price-bids.price));
	//logger.write('orders|'+now+'|'+average.vol+'|'+average.price+'|'+average.weight+'\n');
	write('orders',{
		timestamp:now,
		volume:average.vol,
		price:average.price,
		weight:average.weight
	})
}
function addTrade(trade){
    const now = trade.timestamp*1000;
    let rate;
      
    //trade.timestamp = now;
    active_price = trade.price;
    //trade.inertia = prev_price?(trade.price - prev_price)*trade.amount:0;
    trade.inertia = trade.price*trade.amount;
	//prev_price = trade.price;
    trade.type?trade_inertia -= trade.inertia:trade_inertia += trade.inertia;
    inertias.push(trade_inertia);
    if(inertias.length > 100) inertias.shift();
    trade_inertia = inertias.reduce((a, b) => a + b, 0)/inertias.length;
    trade_inertia = Math.round(trade_inertia);

	if(!first_trade){
		startup_price.push(trade.price);
		last_price = startup_price.reduce((a, b) => a + b,0)/startup_price.length;
		console.log("startup price:"+last_price)
	}

    if((prev_inertia > 0 && trade_inertia < 0)||(prev_inertia < 0 && trade_inertia > 0)){
        console.log('-------------------SWING----------------------------');
    }
    prev_inertia = trade_inertia;


	//rate = live_trades.length/(trade_window/60000);
	console.log(trade.price+' : '+trade_inertia+' : '+rate+'/minute');
	//logger.write('trade|'+now+'|'+trade.price+'|'+trade_inertia+'|'+rate+'\n');
	write('trade',{
		timestamp:now,
		price:trade.price,
		inertia:trade_inertia
	})
	
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
