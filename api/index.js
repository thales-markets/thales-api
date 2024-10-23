const { initServices } = require("./services/initialize");

const app = async () => {
  await initServices();
  require("../controller");
};

app();
