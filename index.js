redisClient = null;

gameFinishersMap = new Map();
userReffererIDsMap = new Map();

require("dotenv").config();
require("./redis/redis");
require("./api/controller");
