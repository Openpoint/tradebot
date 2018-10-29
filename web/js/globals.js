"use strict";

const Sales = document.getElementById("sales");
const {datestamp} = tb_time;
const {string} = tb_money;

export const sales = [];
export function makeSale(trade){
	const T = {};
	T[trade.dir] = {
		price:trade.price,
		timestamp:trade.timestamp
	};
	sales.push(T);
}
export function printSales(){
	for (let i in sales){
		printSale(sales[i]);
	}
}
export function printSale(sale){
	const type = Object.keys(sale)[0];
	sale = sale[type];
	Sales.innerHTML += `<div class = "${type}">[${datestamp(sale.timestamp/1000).log}] $${string.fiat(sale.price)}</div>`;
}
export function reset(){
	Sales.innerHTML="";
}