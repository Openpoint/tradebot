"use strict";

const Pusher = require("pusher-js");
const crypto = require("crypto");
const request = require("request");
const {markets} = require("./globals");
const {Log} = require("./logging");

const pusher = new Pusher("de504dc5763aeef9ff52");

const pair = markets.pair;
const key = markets.bitstamp.api_key;
const secret = markets.bitstamp.api_secret;
const client_id = markets.bitstamp.user_id;
const timeout = 60000;
const host = "https://www.bitstamp.net/api/v2/";

exports.channels = {
	trades:pusher.subscribe("live_trades"),
	orders:pusher.subscribe("order_book")
};

exports.private = {
	balance:function(callback){
		let params = getParams();
		const url = host+"balance/"+pair+"/";
		post(url,params,callback);
	},
	sell:function(amount,callback){
		let params = getParams();
		params.amount = amount;
		const url = host+"sell/instant/"+pair+"/";
		post(url,params,callback);
	},
	buy:function(amount,callback){
		let params = getParams();
		params.amount = amount;
		const url = host+"buy/instant/"+pair+"/";
		post(url,params,callback);
	}
};
exports.public = {
	ticker:function(callback){
		const url = host+"ticker/"+pair+"/";
		get(url,callback);
	}
};
function get(url,callback){
	request.get(url,{
		json:true,
		timeout:timeout
	},(err, res, body) => {
		callback(err,body);
	});
}
function post(url,params,callback){
	request.post(url,{
		json:true,
		form:params,
		timeout:timeout
	},(err,res,body) => {
		let error;
		if(err || body.status === "error") error = err || body.reason;
		if(typeof error === "object") error = JSON.stringify(error,null,"\t");
		if(error) Log.error("Error in API: %s",error);
		callback(error,body);
	});
}

function getParams(){
	const Hash = crypto.createHmac("sha256",secret);
	const nonce = Date.now();
	const message = nonce+client_id+key;
	const hash = Hash.update(message).digest("hex").toUpperCase();
	return {
		"key":key,
		"signature":hash,
		"nonce":nonce,
	};
}