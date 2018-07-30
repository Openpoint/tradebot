"use strict"

const chart = document.getElementById('chart');
const socket = io(); 

const Make = {
	trade:function(data,bulk){
		
		if(!Array.isArray(data)) data = [data];
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			plots.trade.x.push(time);
			plots.trade.y.push(item.price);
			plots.rate.x.push(time);
			plots.inertia.x.push(time);
			plots.inertia.y.push(item.inertia);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	sell:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			plots.sell.x.push(time);
			plots.sell.y.push(item.price);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	buy:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			plots.buy.x.push(time);
			plots.buy.y.push(item.price);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	orders:function(data,bulk){
		if(!Array.isArray(data)) data = [data];
		console.log(data);
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			plots.orderv.x.push(time);
			plots.orderv.y.push(item.weight*-1);
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);
	},
	resistance:function(data,bulk){	
		if(!Array.isArray(data)) data = [data];	
		data.forEach((item)=>{
			let time = new Date(item.timestamp);
			plots.resistance.x.push(time);
			plots.resistance.y.push(item.resistance)
		})
		if(bulk) return;
		Plotly.react(chart,layers,layout);		
	}
}
socket.on('all',(data)=>{
	console.log(data);
	Object.keys(data).forEach((key)=>{
		if(Make[key]) Make[key](data[key],true);
	})

	Plotly.newPlot(chart,layers,layout);
})
Object.keys(Make).forEach((key)=>{
	socket.on(key,(data)=>{
		layout.datarevision++;
		Make[key](data);
	})	
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
		hoverinfo:"y+name",
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
		hoverinfo:"y+name",
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
	},
	resistance:{
        x:[],
		y:[],
		name:'Buy/Sell resistance point',
		yaxis:'y2',
		hoverinfo:"y+name",
		line:{
			dash:'dot',
			shape:'hv',
			width:0.5,
			color:'black'
		},

	}
}
const layout = {
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
	bargroupgap:0.28,
	datarevision:0
}

const layers = Object.keys(plots).map((key)=>{
	return plots[key];
});
