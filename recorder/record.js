"use strict";

const path = require('path');
const fs = require('fs');
const LZString = require('lz-string');
const tools = require('../lib/tools/calctools.js');

let datafile;
let logger;

exports.input = function(trade){
    const data = {
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
}

function start(ts){
    datafile = path.join(__dirname,'data/record'+tools.timestamp(ts,true));
    let datadir = path.join(__dirname,'data');
    if(!fs.existsSync(datadir)) fs.mkdirSync(datadir);
    if(fs.existsSync(datafile) && logger) return;
    if(logger) logger.close();    
    logger = fs.createWriteStream(datafile,{
        flags:'a',
        encoding:'ucs2'
    });
}

function write(data){
   try{
    data = LZString.compress(JSON.stringify(data));
    start(data.t.timestamp);
    logger.write(data+'\n');
   } 
   catch(err){
       console.log(err);
   }
}
