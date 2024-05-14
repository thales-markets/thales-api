const PREFIX_KEYS = {
  Stakers: "STAKERS--",
  LiquidityPool: "LIQUIDITY_POOL--",
};

const getStakersKey = (networkId) => {
  return `${PREFIX_KEYS.Stakers}${networkId}`;
};

module.exports = {
  PREFIX_KEYS,
  getStakersKey,
};
