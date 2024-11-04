const { initServices } = require("./services/init");

const app = async () => {
  console.log("Initialize services...");
  await initServices();
  console.log("Initialized!");

  console.log("Starting controller...");
  require("./controller");
};

app();
