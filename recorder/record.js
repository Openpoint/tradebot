"use strict";

const path = require('path');
const fs = require('fs');
const LZString = require('lz-string');
const tools = require('../lib/tools/calctools.js');
const dir = state.record?
    path.join(__rootdir,'recorder/data/'):
    path.join(__rootdir,'recorder/data/buffer');

let datafile;
let logger;

exports.input = function(trade){
    if(!state.order_bids||!state.order_asks) return;
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
    datafile = path.join(dir,'record'+tools.timestamp(ts,true));
    if(!fs.existsSync(dir)) fs.mkdirSync(dir);
    if(fs.existsSync(datafile) && logger) return;
    if(logger) logger.close();    
    logger = fs.createWriteStream(datafile,{
        flags:'a',
        encoding:'ucs2'
    });
}

function write(data){
    try {
        let ts = data.t.timestamp
        data = LZString.compress(JSON.stringify(data));
        start(ts);
        logger.write(data+'\n');
    } 
    catch(err){
        Log.error(err);
    }
}
