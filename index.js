redisClient = null;

mainnetWatchlistMap = new Map();
ropstenWatchlistMap = new Map();
displayNameMap = new Map();
gameFinishersMap = new Map();

require("dotenv").config();
require("./redis/redis");
require("./api/controller");
