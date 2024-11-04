const { connectDefaultRedisClient } = require("../../redis/client");

const initServices = async () => {
  await connectDefaultRedisClient();
};

module.exports = {
  initServices,
};
