"use strict";

const Sales = document.getElementById("sales");
const {datestamp} = tb_time;
const {string} = tb_money;

export const sales = [];
export function makeSale(trade){
	return {
		dir:trade.dir,
		price:trade.price,
		coin:trade.wallet.coin,
		fiat:trade.wallet.fiat,
		timestamp:trade.timestamp
	};
}
export function printSales(){
	for (let i in sales){
		printSale(sales[i]);
	}
}
export function printSale(sale){
	Sales.innerHTML += `<div class = "sale ${sale.dir}">
		<div>${sale.dir.toUpperCase()} [${datestamp(sale.timestamp/1000).web}]</div>
		<div>${sale.dir === "buy"?"<strong>":""}BTC:${string.crypto(sale.coin)}${sale.dir === "buy"?"</strong>":""} | ${sale.dir === "sell"?"<strong>":""}$${string.fiat(sale.fiat)}${sale.dir === "sell"?"</strong>":""}</div>
	</div>`;
}