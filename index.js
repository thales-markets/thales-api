require("dotenv").config();

var express = require("express");
var app = express();

var cors = require('cors');
app.use(cors());

app.listen(process.env.PORT || 3002, () => {
    console.log("Server running on port " + (process.env.PORT || 3002));
});

const thalesData = require("thales-data");
const redis = require("redis");
let redisClient = null;

let mainnetOptionsMap = new Map();
let ropstenOptionsMap = new Map();

const fetch = require("node-fetch");

app.get("/options/:networkParam/:addressParam", (req, res) => {
    let add = req.params.addressParam;
    let network = req.params.networkParam;
    if (network == 1) {
        if (mainnetOptionsMap.has(add)) {
            res.send(mainnetOptionsMap.get(add) + "");
        } else res.send("0");
    } else {
        if (ropstenOptionsMap.has(add)) {
            res.send(ropstenOptionsMap.get(add) + "");
        } else res.send("0");
    }
});

app.get("/", (req, res) => {
    res.sendStatus(200);
});

if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL);
    redisClient.on("error", function (error) {
        console.error(error);
    });

    redisClient.get("mainnetOptionsMap", function (err, obj) {
        mainnetOptionsMapRaw = obj;
        console.log("mainnetOptionsMapRaw:" + mainnetOptionsMapRaw);
        if (mainnetOptionsMapRaw) {
            mainnetOptionsMap = new Map(JSON.parse(mainnetOptionsMapRaw));
            console.log("mainnetOptionsMap:" + mainnetOptionsMap);
        }
    });

    redisClient.get("ropstenOptionsMap", function (err, obj) {
        ropstenOptionsMapRaw = obj;
        console.log("ropstenOptionsMapRaw:" + ropstenOptionsMapRaw);
        if (ropstenOptionsMapRaw) {
            ropstenOptionsMap = new Map(JSON.parse(ropstenOptionsMapRaw));
            console.log("ropstenOptionsMap:" + ropstenOptionsMap);
        }
    });
}

async function processMainnetMarkets() {
    const mainnetOptionsMarkets = await thalesData.binaryOptions.markets({
        max: Infinity,
        network: 1,
    });

    for (const o of mainnetOptionsMarkets) {
        if (
            "trading" ==
            getPhaseAndEndDate(o.biddingEndDate, o.maturityDate, o.expiryDate).phase
        ) {
            try {
                let ordersCount = 0;
                let baseUrl = "https://api.0x.org/sra/v4/";
                let response = await fetch(
                    baseUrl +
                    `orderbook?baseToken=` +
                    o.longAddress +
                    "&quoteToken=" +
                    "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51"
                );
                let responseJ = await response.json();
                const totalLong = responseJ.bids.total + responseJ.asks.total;

                response = await fetch(
                    baseUrl +
                    `orderbook?baseToken=` +
                    o.shortAddress +
                    "&quoteToken=" +
                    "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51"
                );
                responseJ = await response.json();
                const totalShort = responseJ.bids.total + responseJ.asks.total;

                ordersCount = totalLong + totalShort;

                mainnetOptionsMap.set(o.address, ordersCount);
                if (process.env.REDIS_URL) {
                    redisClient.set(
                        "mainnetOptionsMap",
                        JSON.stringify([...mainnetOptionsMap]),
                        function () {
                        }
                    );
                }
            } catch (e) {
                mainnetOptionsMap.set(o.address, 0);
                if (process.env.REDIS_URL) {
                    redisClient.set(
                        "mainnetOptionsMap",
                        JSON.stringify([...mainnetOptionsMap]),
                        function () {
                        }
                    );
                }
            }
        }
    }
}

setTimeout(processMainnetMarkets, 1000 * 3);
setInterval(processMainnetMarkets, 1000 * 30);

async function processRopstenMarkets() {

    const ropstenOptionsMarkets = await thalesData.binaryOptions.markets({
        max: Infinity,
        network: 3,
    });

    for (const o of ropstenOptionsMarkets) {
        if (
            "trading" ==
            getPhaseAndEndDate(o.biddingEndDate, o.maturityDate, o.expiryDate).phase
        ) {
            try {
                let ordersCount = 0;
                let baseUrl = "https://ropsten.api.0x.org/sra/v4/";
                let response = await fetch(
                    baseUrl +
                    `orderbook?baseToken=` +
                    o.longAddress +
                    "&quoteToken=" +
                    "0x21718C0FbD10900565fa57C76e1862cd3F6a4d8E"
                );
                let responseJ = await response.json();
                const totalLong = responseJ.bids.total + responseJ.asks.total;

                response = await fetch(
                    baseUrl +
                    `orderbook?baseToken=` +
                    o.shortAddress +
                    "&quoteToken=" +
                    "0x21718C0FbD10900565fa57C76e1862cd3F6a4d8E"
                );
                responseJ = await response.json();
                const totalShort = responseJ.bids.total + responseJ.asks.total;

                ordersCount = totalLong + totalShort;

                ropstenOptionsMap.set(o.address, ordersCount);
                if (process.env.REDIS_URL) {
                    redisClient.set(
                        "ropstenOptionsMap",
                        JSON.stringify([...ropstenOptionsMap]),
                        function () {
                        }
                    );
                }
            } catch (e) {
                mainnetOptionsMap.set(o.address, 0);
                if (process.env.REDIS_URL) {
                    redisClient.set(
                        "mainnetOptionsMap",
                        JSON.stringify([...mainnetOptionsMap]),
                        function () {
                        }
                    );
                }
            }
        }
    }
}

setTimeout(processRopstenMarkets, 1000 * 3);
setInterval(processRopstenMarkets, 1000 * 30);

function getPhaseAndEndDate(biddingEndDate, maturityDate, expiryDate) {
    const now = Date.now();

    if (biddingEndDate > now) {
        return {
            phase: "bidding",
            timeRemaining: biddingEndDate,
        };
    }

    if (maturityDate > now) {
        return {
            phase: "trading",
            timeRemaining: maturityDate,
        };
    }

    if (expiryDate > now) {
        return {
            phase: "maturity",
            timeRemaining: expiryDate,
        };
    }

    return {
        phase: "expiry",
        timeRemaining: expiryDate,
    };
}
