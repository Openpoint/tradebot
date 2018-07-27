"use strict";

const chart = document.getElementById('chart');
const file = "two";
function Plot(data){
	Plotly.plot(chart,data,style);
}

fetch('http://localhost:8080/trade?file='+file).then((response)=>{
    return response.json();
}).then((data)=>{
    data.forEach((item)=>{
        let time = new Date(item.timestamp);
        plots.trade.x.push(time);
        plots.trade.y.push(item.price);
        plots.rate.x.push(time);
        plots.inertia.x.push(time);
        plots.inertia.y.push(item.inertia);
	})
	Plot([plots.trade,plots.rate,plots.inertia]);
})
fetch('http://localhost:8080/sell?file='+file).then((response)=>{
    return response.json();
}).then((data)=>{
	data.forEach((item)=>{
		let time = new Date(item.timestamp);
		plots.sell.x.push(time);
		plots.sell.y.push(item.price);
	})
	Plot([plots.sell]);	
})

fetch('http://localhost:8080/buy?file='+file).then((response)=>{
    return response.json();
}).then((data)=>{
	data.forEach((item)=>{
		let time = new Date(item.timestamp);
		plots.buy.x.push(time);
		plots.buy.y.push(item.price);
	})
	Plot([plots.buy]);
})
fetch('http://localhost:8080/orders?file='+file).then((response)=>{
    return response.json();
}).then((data)=>{
	data.forEach((item)=>{
		let time = new Date(item.timestamp);
		plots.orderv.x.push(time);
		plots.orderv.y.push(item.volume*-1);
	})
	Plot([plots.orderv]);
})
const plots = {
	rate:{
        x:[],
        type:'histogram',
		name:'Trade frequency',
		opacity:0.4,
		hoverinfo:"y+name",
		marker:{
			color:'dodgerblue'
		}
        
    },
    inertia:{
        x:[],
        y:[],
        name:'inertia',
		yaxis:'y2',
		line:{
			width:1,
			shape:'line',
			color:'orange'
		},
		hoverinfo:"y+name"        
    },
    trade:{
        x:[],
        y:[],
		name:'Price',
		yaxis:'y3',
		hoverinfo:"y+name",
		line:{
			color:'black',
			width:2,
			shape:"line",
		}
	},
	buy:{
		x:[],
		y:[],
		name:'Buy',
		yaxis:'y3',
		marker:{
			symbol:'circle',
			size:12,
			opacity:.8,
			color:'green'
		},
		line:{
			width:0
		}
	},
	sell:{
		x:[],
		y:[],
		name:'Sell',
		yaxis:'y3',
		marker:{
			symbol:'circle',
			size:12,
			opacity:.8,
			color:'red'
		},
		line:{
			width:0
		}
	},
    orderv:{
        x:[],
        y:[],
		name:'Order book demand',
		yaxis:'y4',
		hoverinfo:"y+name",
		line:{
			color:'gray',
			width:1,
			shape:"line",
		}
	}
}
const style = {
	yaxis:{
		showticklabels:false,
		showline:false,
		showgrid:false,
		zerolinecolor:'dodgerblue',
		zerolinewidth:2,
		domain:[0.4,0.7]
		
	},
	yaxis2:{
		//overlaying: 'y',
		//showticklabels:false,
		showline:false,
		//showgrid:false,
		zerolinecolor:"orange",
		zerolinewidth:0.1,
		domain:[0,0.3]
	},	
	yaxis3:{
		side:'left',
		overlaying: 'y',
		domain:[0.4,0.7],
		zeroline:false
	},
	yaxis4:{
		//overlaying: 'y',
		showticklabels:false,
		showline:false,
		showgrid:false,
		zerolinecolor:"grey",
		zerolinewidth:0.1,
		domain:[0.7,1]
	},
	bargroupgap:0.28
}


