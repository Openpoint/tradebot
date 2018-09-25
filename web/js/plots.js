"use strict";


export function getOption(Data){
	return {
		grid: [
			new grid('23%','5%'),
			new grid('10.5%','30%'),
			new grid('10.5%','42%'),
			new grid('10.5%','54%'),
			new grid('10.5%','66%'),
			new grid('10.5%','78%'),
			new grid('3%','92%')
		],
		xAxis:[
			new xaxis(),
			new xaxis(1),
			new xaxis(2),
			new xaxis(3),
			new xaxis(4),
			new xaxis(5,true),
			new xaxis(6),
		],
		yAxis: [
			new yaxis('Price'),
			new yaxis('Sentiment',1),
			new yaxis('Inertia',2),
			new yaxis('Speed',3),
			new yaxis('Orders',4),
			new yaxis('Incline',5),
			new yaxis(null,6,true)
		],
		series: [
			new series({name:'Price',type:'line',data:Data.price.price,color:'black',width:1.5}),
			new series({name:'Average',type:'line',data:Data.price.average,color:'dodgerblue',width:0.5}),
			new series({name:'Target',type:'line',data:Data.price.target,color:'rgba(0,0,0,.3)',style:'dots',width:1,fill:true,step:'end'}),
			new series({name:'Buy price',type:'scatter',data:Data.price.buy,color:'lime'}),
			new series({name:'Sell price',type:'scatter',data:Data.price.sell,color:'red'}),

			new series({name:'Sentiment',type:'line',data:Data.sentiment.bullbear,color:'dodgerblue',fill:true,index:1}),
			new series({name:'Peak',type:'line',data:Data.sentiment.peak,color:'black',index:1,style:'dots',width:1,step:'middle'}),
			new series({name:'Buy',type:'scatter',data:Data.sentiment.buy,color:'lime',index:1}),
			new series({name:'Sell',type:'scatter',data:Data.sentiment.sell,color:'red',index:1}),

			new series({name:'Inertia',type:'line',data:Data.inertia.inertia,color:'darkorange',fill:true,index:2}),
			new series({name:'Peak',type:'line',data:Data.inertia.peak,color:'black',index:2,style:'dots',width:1,step:'middle'}),
			new series({name:'Buy',type:'scatter',data:Data.inertia.buy,color:'lime',index:2}),
			new series({name:'Sell',type:'scatter',data:Data.inertia.sell,color:'red',index:2}),

			new series({name:'Speed',type:'line',data:Data.speed.frenzy,color:'SeaGreen',fill:true,index:3}),
			new series({name:'Peak',type:'line',data:Data.speed.peak,color:'black',index:3,style:'dots',width:1,step:'middle'}),
			new series({name:'Buy',type:'scatter',data:Data.speed.buy,color:'lime',index:3}),
			new series({name:'Sell',type:'scatter',data:Data.speed.sell,color:'red',index:3}),

			new series({name:'Orders',type:'line',data:Data.orders.orders,color:'violet',fill:true,index:4}),
			new series({name:'Peak',type:'line',data:Data.orders.peak,color:'black',index:4,style:'dots',width:1,step:'middle'}),
			new series({name:'Buy',type:'scatter',data:Data.orders.buy,color:'lime',index:4}),
			new series({name:'Sell',type:'scatter',data:Data.orders.sell,color:'red',index:4}),

			new series({name:'Incline',type:'line',data:Data.incline.incline,color:'gold',fill:true,index:5}),
			new series({name:'Peak',type:'line',data:Data.incline.peak,color:'black',index:5,style:'dots',width:1,step:'middle'}),
			new series({name:'Buy',type:'scatter',data:Data.incline.buy,color:'lime',index:5}),
			new series({name:'Sell',type:'scatter',data:Data.incline.sell,color:'red',index:5}),

			new series({name:'Peaked',type:'line',data:Data.peaked,color:'black',fill:true,step:'start',index:6}),
		],
		tooltip: {
			trigger: 'axis',
			axisPointer:{
				type:'cross'
			},
			formatter:function(params, ticket, callback){

				let index;
				let string='<div class="tooltip">';
				if(typeof params.length === 'number'){
					params.forEach((p,i)=>{
						if((p.axisIndex === index+1)) string+="</div>"
						if(p.axisIndex !== index){
							string+=('<div class="section s'+p.axisIndex+'"><div class="heading">'+p.seriesName+"</div>");						
						}
						string+=('<div class="dataitem">'+p.seriesName+': <span>'+p.data[1]+'</span></div>');
						if(i===params.length-1) string+="</div>";					
						index = p.axisIndex
					})
				}else{
					string+=("<div class='section'>"+params.marker+params.seriesName+": "+params.data[1]+"</div>");
				}

				string+='</div>';
				
				return string;
			}
		},
		toolbox: {
			feature: {
				dataZoom: {
					yAxisIndex: 'none'
				},
				restore: {},
				saveAsImage: {}
			}
		},
		axisPointer: {
			link: {
				xAxisIndex: 'all'
			}			
		},	
		dataZoom:{
			realtime:false,
			filterMode:'filter',
			xAxisIndex: [0,1,2,3,4,5,6]
		}
	}
};


function grid(height,top){
	return {
        left:70,
        right:12,
		height:height,
		top:top,
			
	}
}
function xaxis(index,show){
	let x = {
		type:'time',
		position:'bottom',		
		boundaryGap:true,
		silent:true,
		axisLabel:{
			show:show||false,
		},
		axisPointer:{
			label:{
				show:show||false
			}
		},
	}
	if(index) x.gridIndex = index;
	return x;
}
function yaxis(name,index,hide){
	let y = {
		name:name,
		type:'value',
		nameLocation:'middle',
		nameRotate:90,
		nameGap:50,
		show:hide?false:true,
		splitLine:{
			lineStyle:{
				opacity:0.5
			}
		},
		nameTextStyle:{
			fontWeight:'bold'
		}
	}
	if(index) y.gridIndex = index;
	return y;
}
function series(i){
	let s = {
		name:i.name,
		type:i.type,
		hoverAnimation: false,
		animation:false,
		data:i.data,
	}
	if(i.index){
		s.xAxisIndex = i.index;
		s.yAxisIndex = i.index;
	}
	if(i.type === 'line'){
		s.showSymbol = false;
		s.lineStyle = {
            normal: {
                color:i.color,
				width:i.width||1,
				type:i.style||'solid'
            }
		}
		if(i.step) s.step = i.step;
		if(i.fill) s.areaStyle = {
			color:i.color,
			opacity:0.2
		}
	}else{
		s.symbolSize = (i.name==='Buy price'||i.name === 'Sell price')?20:10;
		s.tooltip = {
			trigger:'item'
		};
		s.itemStyle={
            normal: {
				color:i.color,
				opacity:0.5
            }
        }
	}
	return s;
}

export function getData(){
	return {
		price:{
			price:[],
			buy:[],
			sell:[],
			average:[],
			target:[]
		},
		inertia:{
			inertia:[],
			buy:[],
			sell:[],
			peak:[]
		},
		sentiment:{
			bullbear:[],
			buy:[],
			sell:[],
			peak:[]
		},
		speed:{
			frenzy:[],
			buy:[],
			sell:[],
			peak:[]
		},
		orders:{
			orders:[],
			buy:[],
			sell:[],
			peak:[]
		},
		incline:{
			incline:[],
			buy:[],
			sell:[],
			peak:[]
		},
		peaked:[]
	}
}