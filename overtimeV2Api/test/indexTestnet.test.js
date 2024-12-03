describe("Check OvertimeV2 testnet initialization", () => {
  it("checks redis client is connected", async () => {
    require("../indexTestnet");
    const { redisClient } = require("../../redis/client");
    expect(redisClient.isOpen).toBe(true);
  });
});
