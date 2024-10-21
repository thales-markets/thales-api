const redis = require("redis");

const redisClient = redis.createClient(process.env.REDIS_URL);

const getValueFromRedisAsync = (key) => {
  return new Promise((resolve, reject) => {
    redisClient.get(key, (err, obj) => {
      if (err) {
        reject(err);
      } else {
        const value = JSON.parse(obj);
        resolve(value);
      }
    });
  });
};

const getValuesFromRedisAsync = (keys, removeNulls = true) => {
  return new Promise((resolve, reject) => {
    redisClient.mget(keys, (err, objArray) => {
      if (err) {
        reject(err);
      } else {
        const objArrayFiltered = removeNulls ? objArray.filter((value) => value !== null) : objArray;
        const valuesArray = objArrayFiltered.map((value) => JSON.parse(value));
        resolve(valuesArray);
      }
    });
  });
};

module.exports = {
  redisClient,
  getValueFromRedisAsync,
  getValuesFromRedisAsync,
};
