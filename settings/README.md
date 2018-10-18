# Settings explained
```json
{
	"markets":{
		"bitstamp":{
            "user_id":"",
            "api_key":"",
            "api_secret":""
		},
		"pair":"btcusd"
	},
	"port":80,
	"datafile":"tradedata",
	"sauce":{
		"glutlimits":{
			"inertia":[0,0],
			"speed":[0,0],
			"orders":[0,0],
			"incline":[0,0],
			"trend":[0,0]
		},
		"limits":{
			"inertia":[0,0],
			"speed":[0,0],
			"orders":[0,0],
			"incline":[0,0],
			"trend":[0,0]
		},
		"weights":{
			"inertia":0,
			"speed":0,
			"orders":0,
			"incline":0,
			"trend":0
		},
		"triggers":{
			"total":0
		},
		"cliff":{
			"time":"0h",
			"price":0,
			"total":0
		},
		"emergency":{
			"cut":"0h",
			"limit":0
		},
		"smoothing":"0s",
		"long_average":"0h",
		"short_average":"0m"
	}
}
```
## "sauce":
This is the tuning for the algorithm., and each item can be a number `0`, number pair `[0,0]` or a text string denoting a time period `"0s", "0m", "0h"` for seconds, minutes, hours.

All numeric values relate to fiat values, corresponding to the ranges in the [graph](https://user-images.githubusercontent.com/998947/47151580-05f97600-d2d2-11e8-88bb-508450b9c019.png)

Number pairs `[0,0]` denote high/low values.
* **limits:** [The value before the graph can be considered a peak, the value to drop by before the graph can be a peak]
* **glutlimits:** [The value above which item is in a freny, The +/- value between which item is in a doldrum]