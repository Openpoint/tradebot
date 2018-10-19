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
	"sauce":{
		"glutLimits":{
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
* **limits: [** The value before the graph can be considered a peak **,** the value to change up/down by before the graph can be a peak **]**

* **glutLimits:** **[** The value above which the item is considered to be in a frenzy **,** The +/- range between which the item is considered to be in a doldrum **]**

* **weights:** The addative boost each item gives to `triggers.total` if it meets an algorithmic criteria.

* **triggers.total:** The total value limit before triggering a potential trade condition.

* **cliff:** The general condition where the algorithm considers the market to be in an extreme slide / rise
  * **time:** Time limit before, if a trade is not executed, cliff is unset.
  * **price:** Value for a sudden drop / rise in price that will trigger a cliff.
  * **total:** Same as `triggers.total` except the limit to trigger a 'cliff' condition
  
* **emergency:** Condition where that market has moved unfavourably for the algorithm, and it will buy/sell at a loss.
  * **cut:** Time limit since the market was last profitable until tradebot may take emergency action
  * **limit:** The limit the market price average must have moved away from profit before tradebot will take emergency action.
  
* **smoothing:** The time frequency for which all incoming trades will be averaged into one trade item for analysis.

* **long_average:** The time over which all trade items are averaged into a reading against which `short_average` is compared.

* **short_average** The time over which all trade items are averaged into a reading which is compared against `long_average`

