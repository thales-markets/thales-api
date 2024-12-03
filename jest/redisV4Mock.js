// redis-mock has not been updated for node-redis v4 yet, but the main changes
// in the API are camelCase names and promises instead of callback, so we can work around it.
// https://github.com/yeahoffline/redis-mock/issues/195

const redis = require("redis-mock");
const { promisify } = require("util");

const client = redis.createClient();
const set = promisify(client.set).bind(client);
const setEx = promisify(client.setex).bind(client);

const v4Client = {
  isOpen: false,
  connect: () => (v4Client.isOpen = true),
  get: promisify(client.get).bind(client),
  set: (key, value) => set(key, value),
  del: promisify(client.del).bind(client),
  hSet: promisify(client.hset).bind(client),
  hGet: promisify(client.hget).bind(client),
  hDel: promisify(client.hdel).bind(client),
  flushAll: promisify(client.flushall).bind(client),
  setEx: promisify(client.setex).bind(client),
  expire: promisify(client.expire).bind(client),
  mGet: promisify(client.mget).bind(client),
  mSet: promisify(client.mset).bind(client),
  pSetEx: (key, ms, value) => setEx(key, ms / 1000, value),
  on: () => v4Client,
  // Add additional functions as needed...
};

module.exports = { ...redis, createClient: () => v4Client };
