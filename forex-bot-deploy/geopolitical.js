const chalk = require('chalk');

const MOST_TRADED_PAIRS = {
  USD: { 'EUR/USD': 35.0, 'USD/JPY': 25.0, 'GBP/USD': 20.0, 'AUD/USD': 10.0, 'USD/CAD': 5.0 },
  EUR: { 'EUR/USD': 40.0, 'EUR/JPY': 20.0, 'EUR/GBP': 15.0, 'EUR/AUD': 10.0, 'EUR/CHF': 5.0 },
  GBP: { 'GBP/USD': 30.0, 'EUR/GBP': 25.0, 'GBP/JPY': 20.0, 'GBP/AUD': 15.0, 'GBP/CAD': 5.0 },
  JPY: { 'USD/JPY': 40.0, 'EUR/JPY': 25.0, 'GBP/JPY': 15.0, 'AUD/JPY': 10.0, 'NZD/JPY': 5.0 },
  CHF: { 'EUR/CHF': 35.0, 'USD/CHF': 30.0, 'CHF/JPY': 15.0, 'GBP/CHF': 10.0, 'AUD/CHF': 5.0 },
  AUD: { 'AUD/USD': 30.0, 'AUD/JPY': 20.0, 'AUD/CAD': 15.0, 'AUD/NZD': 10.0, 'EUR/AUD': 8.0 },
  CAD: { 'USD/CAD': 40.0, 'CAD/JPY': 25.0, 'EUR/CAD': 15.0, 'AUD/CAD': 10.0, 'GBP/CAD': 5.0 },
  NZD: { 'NZD/USD': 35.0, 'NZD/JPY': 20.0, 'AUD/NZD': 15.0, 'EUR/NZD': 12.0, 'NZD/CAD': 8.0 }
};

const IMPORTS_EXPORTS = {
  USD: {
    exports: { 'Refined Petroleum': 138.0, 'Crude Petroleum': 118.0, 'Petroleum Gas': 116.0, 'Cars': 57.5, 'Integrated Circuits': 49.8 },
    imports: { 'Cars': 178.0, 'Crude Petroleum': 123.0, 'Computers': 90.0, 'Broadcasting Equipment': 82.0, 'Refined Petroleum': 74.0 }
  },
  EUR: {
    exports: { 'Cars': 400.0, 'Packaged Medicaments': 150.0, 'Aircraft': 100.0, 'Vehicle Parts': 90.0, 'Refined Petroleum': 80.0 },
    imports: { 'Crude Petroleum': 300.0, 'Cars': 200.0, 'Refined Petroleum': 150.0, 'Natural Gas': 120.0, 'Computers': 100.0 }
  },
  GBP: {
    exports: { 'Cars': 45.0, 'Packaged Medicaments': 30.0, 'Crude Petroleum': 25.0, 'Refined Petroleum': 20.0, 'Gold': 18.0 },
    imports: { 'Cars': 60.0, 'Gold': 50.0, 'Crude Petroleum': 40.0, 'Refined Petroleum': 35.0, 'Packaged Medicaments': 30.0 }
  },
  JPY: {
    exports: { 'Cars': 104.0, 'Integrated Circuits': 33.0, 'Vehicle Parts': 28.0, 'Industrial Printers': 12.0, 'Ships': 11.0 },
    imports: { 'Crude Petroleum': 64.0, 'Petroleum Gas': 50.0, 'Coal': 25.0, 'Integrated Circuits': 20.0, 'Broadcasting Equipment': 15.0 }
  },
  CHF: {
    exports: { 'Gold': 63.8, 'Packaged Medicaments': 47.2, 'Vaccines & Antisera': 32.1, 'Watches': 20.2, 'Jewelry': 12.5 },
    imports: { 'Gold': 55.4, 'Packaged Medicaments': 20.3, 'Vaccines & Antisera': 15.7, 'Jewelry': 10.1, 'Cars': 7.8 }
  },
  AUD: {
    exports: { 'Iron Ore': 77.2, 'Coal': 55.1, 'Natural Gas': 39.8, 'Gold': 18.9, 'Aluminum Ore': 5.5 },
    imports: { 'Refined Petroleum': 15.6, 'Cars': 14.2, 'Crude Petroleum': 7.6, 'Computers': 7.2, 'Broadcasting Equipment': 6.5 }
  },
  CAD: {
    exports: { 'Crude Petroleum': 98.0, 'Cars': 42.0, 'Gold': 14.0, 'Refined Petroleum': 12.0, 'Vehicle Parts': 10.0 },
    imports: { 'Cars': 28.0, 'Vehicle Parts': 20.0, 'Refined Petroleum': 15.0, 'Computers': 8.0, 'Delivery Trucks': 7.0 }
  },
  NZD: {
    exports: { 'Concentrated Milk': 5.6, 'Butter': 2.5, 'Cheese': 2.3, 'Frozen Bovine Meat': 2.1, 'Rough Wood': 1.7 },
    imports: { 'Cars': 3.5, 'Refined Petroleum': 2.8, 'Crude Petroleum': 1.9, 'Delivery Trucks': 1.2, 'Broadcasting Equipment': 1.1 }
  }
};

const BUY_SELL_CONDITIONS = {
  USD: {
    buy: [
      'Rising S&P 500 (against some currencies)',
      'In times of economic stress or panic',
      'Weak Emerging Markets',
      'Strong (stronger than others) economic numbers'
    ],
    sell: [
      'When global equities are rising',
      'When risk-on sentiment is high',
      'Strong Commodity prices',
      'Whenever other countries have superior economic numbers'
    ]
  },
  EUR: {
    buy: [
      'Rising S&P 500 (against some safety currencies)',
      'When the USD is out of favor',
      'Strong economic numbers relative to others'
    ],
    sell: [
      'When global equities are falling (against safety currencies)',
      'When USD is in favor',
      'Whenever other countries have superior economic numbers'
    ]
  },
  GBP: {
    buy: [
      'Rising S&P 500 (against risk-off currencies)',
      'During election periods',
      'Increased volatility in metals trading',
      'Strong economic numbers'
    ],
    sell: [
      'Falling S&P 500 (against risk-off currencies)',
      'During election periods',
      'Lower volatility in metals trading',
      'Whenever other countries have superior economic numbers'
    ]
  },
  JPY: {
    buy: [
      'Falling S&P 500 - Biggest trends happen here',
      'During credit crisis',
      'World disaster, pandemic, political unrest',
      'Anytime there is fear'
    ],
    sell: [
      'Rising S&P 500 (against risk-on currencies)',
      'When interest rate differentials are high',
      'Investor and trader complacency',
      'In good times (bubbles)'
    ]
  },
  CHF: {
    buy: [
      'Falling S&P 500 - Against risk-on currencies',
      'Rising Gold Prices and Demand',
      'World disaster, pandemic, political unrest',
      'When EUR is weak (only against EUR)'
    ],
    sell: [
      'Rising S&P 500 - Against risk-on currencies',
      'Falling Gold Prices and Demand',
      'When currency swap differentials are high'
    ]
  },
  AUD: {
    buy: [
      'Rising S&P 500 (against risk-off currencies)',
      'Rising Iron Ore & Gold Prices',
      'Strong Chinese economic growth',
      'When RBA rates are higher than other Central Banks'
    ],
    sell: [
      'Falling S&P 500 (against risk-off currencies)',
      'Falling Iron Ore & Gold Prices',
      'When Chinese economic growth is slowing',
      'During global economic or geo-political stress'
    ]
  },
  CAD: {
    buy: [
      'Rising Crude Oil',
      'With rising USD and rising equity markets',
      'Strong Emerging Markets',
      'Strong economic numbers'
    ],
    sell: [
      'When Crude Oil is in decline',
      'When global equities are weak',
      'Weak Commodity prices',
      'Whenever other countries have superior economic numbers'
    ]
  },
  NZD: {
    buy: [
      'Rising S&P 500 (against risk-off currencies)',
      'Rising Iron Ore & Gold Prices',
      'Strong Chinese economic growth',
      'When AUD & Australia growth are less than NZ'
    ],
    sell: [
      'Falling S&P 500 (against risk-off currencies)',
      'Falling Iron Ore & Gold Prices',
      'During global economic or geo-political stress',
      'When AUD & Australia growth are higher than NZ'
    ]
  }
};

function getMostTradedPairs(currency) {
  return MOST_TRADED_PAIRS[currency.toUpperCase()] || {};
}

function getImportsExports(currency) {
  return IMPORTS_EXPORTS[currency.toUpperCase()] || { exports: {}, imports: {} };
}

function getBuySellConditions(currency) {
  return BUY_SELL_CONDITIONS[currency.toUpperCase()] || { buy: [], sell: [] };
}

function getCurrencyProfile(currency) {
  const c = currency.toUpperCase();
  return {
    currency: c,
    mostTradedPairs: getMostTradedPairs(c),
    trade: getImportsExports(c),
    conditions: getBuySellConditions(c),
    topExports: Object.entries(IMPORTS_EXPORTS[c]?.exports || {}).slice(0, 3),
    topImports: Object.entries(IMPORTS_EXPORTS[c]?.imports || {}).slice(0, 3)
  };
}

function getPairGeopoliticalProfile(pair) {
  const base = pair.slice(0, 3).toUpperCase();
  const quote = pair.slice(3, 6).toUpperCase();
  
  return {
    pair,
    baseCurrency: getCurrencyProfile(base),
    quoteCurrency: getCurrencyProfile(quote)
  };
}

function analyzeGeopoliticalBias(pair, strengthData) {
  const profile = getPairGeopoliticalProfile(pair);
  let score = 0;
  const insights = [];

  const baseCond = profile.baseCurrency.conditions;
  const quoteCond = profile.quoteCurrency.conditions;

  if (baseCond.buy.length > 0) {
    score += 1;
    insights.push(`${profile.baseCurrency.currency}: Has buy conditions`);
  }
  if (quoteCond.sell.length > 0) {
    score += 1;
    insights.push(`${profile.quoteCurrency.currency}: Has sell conditions`);
  }

  const baseTradeBalance = Object.values(profile.baseCurrency.trade?.exports || {}).reduce((a, b) => a + b, 0) -
    Object.values(profile.baseCurrency.trade?.imports || {}).reduce((a, b) => a + b, 0);
  const quoteTradeBalance = Object.values(profile.quoteCurrency.trade?.exports || {}).reduce((a, b) => a + b, 0) -
    Object.values(profile.quoteCurrency.trade?.imports || {}).reduce((a, b) => a + b, 0);

  if (baseTradeBalance > quoteTradeBalance) {
    score += 1;
    insights.push(`${profile.baseCurrency.currency}: Stronger trade balance`);
  } else {
    score -= 1;
    insights.push(`${profile.quoteCurrency.currency}: Stronger trade balance`);
  }

  let bias = 'NEUTRAL';
  if (score >= 2) bias = 'BUY';
  else if (score <= -2) bias = 'SELL';

  return { bias, score, insights, profile };
}

function formatGeopoliticalTelegram(profile) {
  let msg = '';
  const cond = profile.conditions;
  
  if (cond.buy.length > 0) {
    msg += `🟢 Buy ${profile.currency}: ${cond.buy[0]}\n`;
  }
  if (cond.sell.length > 0) {
    msg += `🔴 Sell ${profile.currency}: ${cond.sell[0]}\n`;
  }

  return msg;
}

module.exports = {
  MOST_TRADED_PAIRS,
  IMPORTS_EXPORTS,
  BUY_SELL_CONDITIONS,
  getMostTradedPairs,
  getImportsExports,
  getBuySellConditions,
  getCurrencyProfile,
  getPairGeopoliticalProfile,
  analyzeGeopoliticalBias,
  formatGeopoliticalTelegram
};
