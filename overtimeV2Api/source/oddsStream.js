const EventSource = require("eventsource"); // npm install eventsource

const url = "https://api.opticodds.com/api/v2/stream/odds";
const params = {
  key: "e75a7ee8-f59e-413d-9c5c-730633dd8ff6",
  oddsFormat: "Decimal",
  sportsbooks: ["DraftKings"],
  market: ["Moneyline"],
  league: ["WTA"],
};

function connectToStream() {
  // Construct the query string with repeated parameters
  const queryString = new URLSearchParams();
  queryString.append("key", params.key);
  queryString.append("odds_format", params.oddsFormat);
  params.sportsbooks.forEach((sportsbook) => queryString.append("sportsbooks", sportsbook));
  params.market.forEach((market) => queryString.append("market", market));
  params.league.forEach((league) => queryString.append("league", league));

  console.log(`================== STREAM ODDS: ${url}?${queryString.toString()}`);

  const eventSource = new EventSource(`${url}?${queryString.toString()}`);

  eventSource.onmessage = function (event) {
    try {
      const data = JSON.parse(event.data);
      console.log("================== STREAM ODDS: message data:", data);
    } catch (e) {
      console.log("================== STREAM ODDS: Error parsing message data:", e);
    }
  };

  let dataReceivedTime = new Date().getTime();
  eventSource.addEventListener("odds", function (event) {
    const data = JSON.parse(event.data);
    const now = new Date().getTime();
    console.log(`================== STREAM ODDS: ${(now - dataReceivedTime) / 1000} odds data:`, data);
    dataReceivedTime = now;
  });

  eventSource.addEventListener("locked-odds", function (event) {
    const data = JSON.parse(event.data);
    console.log("================== STREAM ODDS: locked-odds data:", data);
  });

  eventSource.onerror = function (event) {
    console.error("================== STREAM ODDS: EventSource failed:", event);
    eventSource.close();
    setTimeout(connectToStream, 1000); // Attempt to reconnect after 1 second
  };
}

module.exports = {
  connectToStream,
};
