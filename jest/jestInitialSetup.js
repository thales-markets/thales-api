jest.mock("redis", () => jest.requireActual("./redisV4Mock"));
// jest.mock("redis", () => jest.requireActual("redis-mock")); // redis V4 is not supported by redis-mock
