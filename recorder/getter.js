"use strict"

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');

function history(){
    const data = {
        trades:[],
        orders:[]
    }
    fs.readdirSync(__dirname).reverse().forEach((file)=>{
        if(!file.startsWith('trades')&&!file.startsWith('orders')) return;
        let type = file.split('s')[0]+'s';
        let indata = fs.readFileSync(path.join(__dirname,file),{
            encoding:'ucs2'
        });
        indata = indata.split('\n');
        indata.forEach((item)=>{
            try{
                item = LZString.decompress(item);
                if(typeof(item)!=='string') return;
                try {
                    data[type].push(JSON.parse(item))
                }
                catch(e){}
            }
            catch(e){
                console.log(item);
            }

        })
    })
    return data;
}

module.exports = history;