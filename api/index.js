const { initServices } = require("./services/init");

const app = async () => {
  console.log("Initialize sevrices...");
  await initServices();
  console.log("Initialized!");

  console.log("Import controller...");
  require("./controller");
  console.log("Imported!");
};

app();
