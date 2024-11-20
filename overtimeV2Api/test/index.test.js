describe("Check OvertimeV2 initialization", () => {
  it("checks redis client is connected", async () => {
    require("../index");
    const { redisClient } = require("../../redis/client");
    expect(redisClient.isOpen).toBe(true);
  });
});
