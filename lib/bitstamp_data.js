"use strict";

const path = require('path');
const Pusher = require("pusher-js");
const crypto = require('crypto');
const request = require('request');
const settings = require(path.join(__rootdir,'settings.json'));

const pusher = new Pusher("de504dc5763aeef9ff52");


const key = settings.markets.bitstamp.api_key;
const secret = settings.markets.bitstamp.api_secret;
const client_id = settings.markets.bitstamp.user_id;
const timeout = 60000;
const host = "https://www.bitstamp.net/api/v2/";
const Hash = crypto.createHmac('sha256',secret);


exports.channels = {
	trades:pusher.subscribe('live_trades'),
	orders:pusher.subscribe('order_book')
}

exports.private = {
	balance:function(pair,callback){
		let params = getParams();
		const url = host+'balance/'+pair+'/';
		post(url,params,callback);
	}
}
exports.public = {
	ticker:function(pair,callback){
		const url = host+'ticker/'+pair+'/';
		get(url,callback);
	}
}
function get(url,callback){
	request.get(url,{
		json:true,
		timeout:timeout
	},(err, res, body) => {
		callback(err,body);
	})
}
function post(url,params,callback){
	request.post(url,{
		json:true,
		form:params,
		timeout:timeout
	},(err,res,body) => {
		callback(err,body);
	})	
}

function getParams(){
	const nonce = Date.now();
	const message = nonce+client_id+key;
	const hash = Hash.update(message).digest('hex').toUpperCase();
	return {		
		"key":key,
		"signature":hash,
		"nonce":nonce,
	};
}

function getPrice(){
	return new Promise((resolve,reject)=>{
		request('https://www.bitstamp.net/api/v2/ticker_hour/btcusd/',{json:true},(err, res, body) => {
			if (err) return reject(err);
			resolve(body);
		})
	})
}
