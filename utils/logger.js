const log4js = require("log4js");

log4js.configure({
  appenders: {
    file: { type: "file", filename: "logs/debug.log", maxLogSize: "10M", backups: 2 }, // 10 MB + 2 backup old files by 10 MB
  },
  categories: {
    default: { appenders: ["file"], level: "info" },
  },
});

const logger = log4js.getLogger();

const logAllInfo = (message) => {
  console.log(message);
  logger.info(message);
};

const logAllError = (message) => {
  console.error(message);
  logger.error(message);
};

module.exports = {
  logger,
  logAllInfo,
  logAllError,
};
