redisClient = null;

gameFinishersMap = new Map();
userReffererIDsMap = new Map();
solanaAddressesMap = new Map();

require("dotenv").config();
require("./redis/redis");
require("./api/controller");
