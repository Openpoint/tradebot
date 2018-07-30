"use strict";

const path = require('path');
const Pusher = require("pusher-js");
const crypto = require('crypto');
const request = require('request');
const settings = require(path.join(__rootdir,'settings.json'));

const pusher = new Pusher("de504dc5763aeef9ff52");
exports.channels = {
	trades:pusher.subscribe('live_trades'),
	orders:pusher.subscribe('order_book')
}

const api_key = settings.markets.bitstamp.api_key;
const api_secret = settings.markets.bitstamp.api_secret;
const user_id = settings.markets.bitstamp.user_id;


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

function getPrice(){
	return new Promise((resolve,reject)=>{
		request('https://www.bitstamp.net/api/v2/ticker_hour/btcusd/',{json:true},(err, res, body) => {
			if (err) return reject(err);
			resolve(body);
		})
	})
}