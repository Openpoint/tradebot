"use strict";

global.state = {};

const path = require('path');
const fs = require('fs');
const Pusher = require("pusher-js");
const LZString = require('lz-string');
const Calc = require('../lib/calc.js');

let datafile;
let logger;

function timestamp(ts){
    const date = new Date(ts*1000)
    let M = date.getMonth()+1;
    M = M<10?'0'+M:M.toString();
    return date.getFullYear()+M+date.getDate();
}
function start(ts){
    datafile = path.join(__dirname,'data/record'+timestamp(ts));
    let datadir = path.join(__dirname,'data');
    if(!fs.existsSync(datadir)) fs.mkdirSync(datadir);
    if(fs.existsSync(datafile)) return;
    if(logger) logger.close();    
    logger = fs.createWriteStream(datafile,{
        flags:'a',
        encoding:'ucs2'
    });
}

const pusher = new Pusher("de504dc5763aeef9ff52");
const tradesChannel = pusher.subscribe('live_trades');
const orderBookChannel = pusher.subscribe('order_book');

orderBookChannel.bind('data',(data)=>{
    Calc.order(data);
})
tradesChannel.bind('trade',(trade)=>{
    
    data = {
        t:{
			amount:trade.amount,
			timestamp:trade.timestamp,
			price:trade.price,
			type:trade.type
		},
        b:state.order_bids,
        a:state.order_asks
    }
    write(data);
})
function write(data){
    start(data.t.timestamp);
    console.log(data);
    data = LZString.compress(JSON.stringify(data));
    logger.write(data+'\n');
}
