redisClient = null;

mainnetWatchlistMap = new Map();
ropstenWatchlistMap = new Map();
displayNameMap = new Map();

require("dotenv").config();
require("./redis/redis");
require("./api/controller");
