# Tradebot
Automated trading on Bitstamp.
![tradebot](https://user-images.githubusercontent.com/998947/47151580-05f97600-d2d2-11e8-88bb-508450b9c019.png)

Tradebot is an algorithm that tries to predict market volatility and automatically trade at the highs/lows.

At this time, it is very much a work in progress and has, over 3 months of data, successfully simulated 1BTC into 1.6BTC.

Tradebot is a Node.js project providing a http web interface (like the image above) at a specified port. It is set up to trade on [Bitstamp](https://bitstamp.net) in USD.

For the brave, and before detailed documentation is available, here is the low-down to get going: 

* Clone this repo onto a Unix like machine, and install the node dependencies with `npm install`.

* From the root dir of the project, copy `settings/settings_temp.json` to `settings/settings_development.json`.

* Fill out the "sauce" section of the settings to start tuning your trading strategy. [Help](https://github.com/Openpoint/tradebot/blob/master/settings)

* Get some sample data by cloning [this repo](https://github.com/Openpoint/tradebotdata) into `recorder/data/recording`

* Record your own data by running `node tradebot recorder`

* Run `node tradebot development` to start a simulation. The http web interface will be at the port specified in the settings.

More detailed documentation will become available as the project progresses.
