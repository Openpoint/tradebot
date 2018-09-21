"use strict";
export const Time = {
	trade:[],
	buy:[],
	sell:[],
	buysell:[]
};
export const layout = {
	yaxis:{
		domain:[0,0.2]		
	},

	yaxis2:{
		domain:[0.2,0.4]
	},
	yaxis3:{
		domain:[0.4,0.6],

	},
	yaxis4:{
		domain:[0.6,0.8],
	},
	yaxis5:{
		domain:[0.8,1],
	},
	datarevision:0
}
export const plots = {
	price:{
		trade:{
			x:Time.trade,
			y:[],
			legendgroup: 'a',
			name:'Price',
			yaxis:'y',
			hoverinfo:"y+name",
			line:{
				color:'black',
				width:2,
			}
		},
		average:{
			x:Time.trade,
			y:[],
			legendgroup: 'a',
			name:'Price average',
			yaxis:'y',
			hoverinfo:"y+name",
			line:{
				width:.5,
				color:'dodgerblue'
			}       
		},
		target:{
			//x:Time.buysell,
			x:Time.trade,
			y:[],
			legendgroup: 'a',
			name:'Profit line',
			yaxis:'y',
			hoverinfo:"y+name",
			line:{
				dash:'dot',
				shape:'hv',
				width:0.5,
				color:'black'
			},
	
		},
		buy:{
			x:Time.buy,
			y:[],
			legendgroup: 'a',
			name:'Buy',
			yaxis:'y',
			hoverinfo:"y+name",
			marker:{
				symbol:'circle',
				size:12,
				opacity:.8,
				color:'lime'
			},
			line:{
				width:0
			}
		},
		sell:{
			x:Time.sell,
			y:[],
			legendgroup: 'a',
			name:'Sell',
			yaxis:'y',
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
	},
	speed:{
		sellspeed:{
			x:Time.trade,
			y:[],
			legendgroup: 'b',
			name:'Sell speed',
			yaxis:'y2',
			line:{
				width:.5,
				opacity:.1,
				color:'red'
			},
			hoverinfo:"y+name" 		
		},
		buyspeed:{
			x:Time.trade,
			y:[],
			legendgroup: 'b',
			name:'Buy speed',
			yaxis:'y2',
			line:{
				width:.5,
				opacity:.1,
				color:'lime'
			},
			hoverinfo:"y+name" 		
		},
		frenzy:{
			x:Time.trade,
			y:[],
			legendgroup: 'b',
			name:'Frenzy',
			yaxis:'y2',
			line:{
				width:1,
				color:'black'
			},
			hoverinfo:"y+name" 		
		},
		peak:{
			x:Time.trade,
			y:[],
			legendgroup: 'b',
			name:'Peak',
			yaxis:'y2',
			line:{
				shape:'hv',
				dash:"dot",
				width:1,
				color:'black'
			},
			hoverinfo:"y+name" 		
		},
		buy:{
			x:Time.buy,
			y:[],
			legendgroup: 'b',
			showlegend: false,
			name:'Buy',
			yaxis:'y2',
			hoverinfo:"y+name",
			marker:{
				symbol:'circle',
				size:12,
				opacity:.8,
				color:'lime'
			},
			line:{
				width:0
			}
		},
		sell:{
			x:Time.sell,
			y:[],
			legendgroup: 'b',
			showlegend: false,
			name:'Sell',
			yaxis:'y2',
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
	},
	sentiment:{
		bull_bear:{
			x:Time.trade,
			y:[],
			legendgroup: 'c',
			name:'Bull | Bear',
			yaxis:'y3',
			hoverinfo:"y+name",
			line:{
				color:'lime',
				width:1,
				shape:"line",
			}
		},
		peak:{
			x:Time.trade,
			y:[],
			legendgroup: 'c',
			name:'Peak',
			yaxis:'y3',
			hoverinfo:"y+name",
			line:{
				dash:'dot',
				shape:'hv',
				color:'lime',
				width:0.5,
				shape:"line",
			}
		},
		orders:{
			x:Time.trade,
			y:[],
			legendgroup: 'c',
			name:'Orders',
			yaxis:'y3',
			hoverinfo:"y+name",
			line:{
				width:.5,
				color:'gray'
			}       
		},
		buy:{
			x:Time.buy,
			y:[],
			legendgroup: 'c',
			showlegend: false,
			name:'Buy',
			yaxis:'y3',
			hoverinfo:"y+name",
			marker:{
				symbol:'circle',
				size:12,
				opacity:.8,
				color:'lime'
			},
			line:{
				width:0
			}
		},
		sell:{
			x:Time.sell,
			y:[],
			legendgroup: 'c',
			showlegend: false,
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
	},
	market:{
		inertia:{
			x:Time.trade,
			y:[],
			legendgroup: 'd',
			name:'inertia',
			yaxis:'y4',
			line:{
				width:1,
				color:'red'
			},
			hoverinfo:"y+name"        
		},
		peak:{
			x:Time.trade,
			y:[],
			legendgroup: 'd',
			name:'Peak',
			yaxis:'y4',
			line:{
				dash:'dot',
				shape:'hv',
				width:0.5,
				color:'red'
			},
			hoverinfo:"y+name"        
		},
		adjusted:{
			x:Time.trade,
			y:[],
			legendgroup: 'd',
			name:'adjusted',
			yaxis:'y4',
			line:{
				dash:'dot',
				width:0.5,
				color:'black'
			},
			hoverinfo:"y+name"        
		},	
		buy:{
			x:Time.buy,
			y:[],
			legendgroup: 'd',
			showlegend: false,
			name:'Buy',
			yaxis:'y4',
			hoverinfo:"y+name",
			marker:{
				symbol:'circle',
				size:12,
				opacity:.8,
				color:'lime'
			},
			line:{
				width:0
			}
		},
		sell:{
			x:Time.sell,
			y:[],
			legendgroup: 'd',
			showlegend: false,
			name:'Sell',
			yaxis:'y4',
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
		}
	},	
	orders:{
		weight:{
			x:Time.trade,
			y:[],
			legendgroup: 'e',
			name:'Order weight',
			yaxis:'y5',
			line:{
				width:1,
				color:'dodgerblue'
			},
			hoverinfo:"y+name" 			
		},
		peak:{
			x:Time.trade,
			y:[],
			legendgroup: 'e',
			name:'Peak',
			yaxis:'y5',
			line:{
				shape:'hv',
				dash:'dot',
				width:0.5,
				color:'dodgerblue'
			},
			hoverinfo:"y+name" 			
		},	
		peaked:{
			x:Time.trade,
			y:[],
			legendgroup: 'e',
			name:'Peaked',
			yaxis:'y5',
			line:{
				shape:'hv',
				dash:'dot',
				width:0.5,
				color:'red'
			},
			hoverinfo:"y+name" 			
		},
		buy:{
			x:Time.buy,
			y:[],
			legendgroup: 'e',
			showlegend: false,
			name:'Buy',
			yaxis:'y5',
			hoverinfo:"y+name",
			marker:{
				symbol:'circle',
				size:12,
				opacity:.8,
				color:'lime'
			},
			line:{
				width:0
			}
		},
		sell:{
			x:Time.sell,
			y:[],
			legendgroup: 'e',
			showlegend: false,
			name:'Sell',
			yaxis:'y5',
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
		}
	},
}