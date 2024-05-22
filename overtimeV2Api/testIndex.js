const playersInfo = require("./source/playersInfo");

async function test() {
  console.log(await playersInfo.processPlayersInfo());
}

test()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
