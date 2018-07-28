"use strict";

const fs = require('fs');
const Pusher = require("pusher-js");
const LZString = require('lz-string');

let tradesfile;
let ordersfile;
let logtrades;
let logorders;
let date = new Date();

function timestamp(){
    let M = date.getMonth()+1;
    M = M<10?'0'+M:M.toString();
    return date.getFullYear()+M+date.getDate();
}
function start(){
    if(logtrades) logtrades.close();
    if(logorders) logorders.close();
    tradesfile = 'trades'+timestamp();
    ordersfile = 'orders'+timestamp();

    logtrades = fs.createWriteStream(tradesfile,{
        flags:'a',
        encoding:'ucs2'
    });
    logorders = fs.createWriteStream(ordersfile,{
        flags:'a',
        encoding:'ucs2'
    });
}
start();
setInterval(()=>{
    start();
},24*60*60*1000)

const pusher = new Pusher("de504dc5763aeef9ff52");
const tradesChannel = pusher.subscribe('live_trades');
const orderBookChannel = pusher.subscribe('order_book');

orderBookChannel.bind('data',(data)=>{
    data = LZString.compress(JSON.stringify(data));
    logorders.write(data+'\n');
})
tradesChannel.bind('trade',(data)=>{
    data = LZString.compress(JSON.stringify(data));
    logtrades.write(data+'\n');
})