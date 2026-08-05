const chalk = require('chalk');

const CORRELATIONS = {
  USD: [
    { ticker: 'EURUSD', pct: -95 },
    { ticker: 'USDJPY', pct: 89 },
    { ticker: 'GC=F (Gold)', pct: -80 },
    { ticker: 'DX (DXY)', pct: 92 },
    { ticker: 'CL=F (Oil)', pct: -82 }
  ],
  EUR: [
    { ticker: 'EURUSD', pct: 95 },
    { ticker: 'EURGBP', pct: 88 },
    { ticker: 'EURAUD', pct: 80 },
    { ticker: 'GC=F (Gold)', pct: -78 },
    { ticker: 'EURJPY', pct: 87 }
  ],
  GBP: [
    { ticker: 'EURGBP', pct: 88 },
    { ticker: 'GBPUSD', pct: 87 },
    { ticker: 'GBPJPY', pct: 84 },
    { ticker: 'CL=F (Oil)', pct: 83 },
    { ticker: '^FTSE', pct: 82 }
  ],
  AUD: [
    { ticker: 'EURAUD', pct: 80 },
    { ticker: 'AUDUSD', pct: 83 },
    { ticker: 'AUDJPY', pct: 79 },
    { ticker: 'GC=F (Gold)', pct: 77 },
    { ticker: '^AXJO', pct: 81 }
  ],
  CAD: [
    { ticker: 'USDCAD', pct: 90 },
    { ticker: 'CADJPY', pct: 85 },
    { ticker: 'CADCHF', pct: 82 },
    { ticker: 'CL=F (Oil)', pct: 88 },
    { ticker: '^GSPC', pct: 80 }
  ],
  CHF: [
    { ticker: 'USDCHF', pct: 85 },
    { ticker: 'CHFJPY', pct: 78 },
    { ticker: 'EURCHF', pct: 81 },
    { ticker: 'GC=F (Gold)', pct: -79 },
    { ticker: 'SMI', pct: 80 }
  ],
  JPY: [
    { ticker: 'USDJPY', pct: 89 },
    { ticker: 'EURJPY', pct: 87 },
    { ticker: 'GBPJPY', pct: 86 },
    { ticker: '^N225', pct: 84 },
    { ticker: 'GC=F (Gold)', pct: -80 }
  ],
  NZD: [
    { ticker: 'NZDUSD', pct: 84 },
    { ticker: 'AUDNZD', pct: 83 },
    { ticker: 'NZDJPY', pct: 82 },
    { ticker: 'DairyPrices', pct: 85 },
    { ticker: 'GC=F (Gold)', pct: 80 }
  ]
};

const INSTRUMENT_NAMES = {
  'EURUSD': 'EUR/USD',
  'USDJPY': 'USD/JPY',
  'EURGBP': 'EUR/GBP',
  'GBPUSD': 'GBP/USD',
  'AUDUSD': 'AUD/USD',
  'USDCAD': 'USD/CAD',
  'NZDUSD': 'NZD/USD',
  'EURAUD': 'EUR/AUD',
  'EURCHF': 'EUR/CHF',
  'EURJPY': 'EUR/JPY',
  'GBPJPY': 'GBP/JPY',
  'AUDJPY': 'AUD/JPY',
  'NZDJPY': 'NZD/JPY',
  'CADJPY': 'CAD/JPY',
  'CHFJPY': 'CHF/JPY',
  'CADCHF': 'CAD/CHF',
  'AUDNZD': 'AUD/NZD',
  'GC=F (Gold)': 'Gold',
  'CL=F (Oil)': 'Crude Oil',
  'DX (DXY)': 'Dollar Index',
  'DXY': 'Dollar Index',
  '^FTSE': 'FTSE 100',
  '^AXJO': 'ASX 200',
  '^GSPC': 'S&P 500',
  '^N225': 'Nikkei 225',
  'SMI': 'Swiss Market',
  'DairyPrices': 'Dairy Prices'
};

function getCorrelations(currency) {
  return CORRELATIONS[currency.toUpperCase()] || [];
}

function getPairCorrelations(pair) {
  const base = pair.slice(0, 3).toUpperCase();
  const quote = pair.slice(3, 6).toUpperCase();
  
  return {
    pair,
    baseCorrelations: getCorrelations(base),
    quoteCorrelations: getCorrelations(quote)
  };
}

function getCorrelationStrength(pct) {
  const abs = Math.abs(pct);
  if (abs >= 90) return 'VERY_STRONG';
  if (abs >= 75) return 'STRONG';
  if (abs >= 50) return 'MODERATE';
  if (abs >= 25) return 'WEAK';
  return 'VERY_WEAK';
}

function checkCorrelationConflict(pair) {
  const base = pair.slice(0, 3).toUpperCase();
  const quote = pair.slice(3, 6).toUpperCase();
  
  const baseCorrs = getCorrelations(base);
  const quoteCorrs = getCorrelations(quote);
  
  const conflicts = [];
  
  for (const bc of baseCorrs) {
    for (const qc of quoteCorrs) {
      if (bc.ticker === qc.ticker) {
        const diff = Math.abs(bc.pct - qc.pct);
        if (diff > 50) {
          conflicts.push({
            instrument: INSTRUMENT_NAMES[bc.ticker] || bc.ticker,
            basePct: bc.pct,
            quotePct: qc.pct,
            diff
          });
        }
      }
    }
  }
  
  return conflicts;
}

function formatCorrelationsTelegram(currency) {
  const corrs = getCorrelations(currency);
  if (corrs.length === 0) return '';
  
  let msg = `🔗 ${currency} Correlations:\n`;
  for (const c of corrs) {
    const name = INSTRUMENT_NAMES[c.ticker] || c.ticker;
    const sign = c.pct >= 0 ? '+' : '';
    const color = c.pct >= 75 ? '🟢' : c.pct <= -75 ? '🔴' : '🟡';
    msg += `  ${color} ${name}: ${sign}${c.pct}%\n`;
  }
  return msg;
}

function getCorrelationInsight(pair) {
  const corrs = getPairCorrelations(pair);
  const insights = [];
  
  const relevantCorrs = corrs.baseCorrs || corrs.quoteCorrs || [];
  
  for (const c of relevantCorrs.slice(0, 3)) {
    const name = INSTRUMENT_NAMES[c.ticker] || c.ticker;
    const strength = getCorrelationStrength(c.pct);
    
    if (c.pct >= 80) {
      insights.push(`${pair} strongly correlated with ${name} (${c.pct}%)`);
    } else if (c.pct <= -80) {
      insights.push(`${pair} inversely correlated with ${name} (${c.pct}%)`);
    }
  }
  
  return insights;
}

module.exports = {
  CORRELATIONS,
  INSTRUMENT_NAMES,
  getCorrelations,
  getPairCorrelations,
  getCorrelationStrength,
  checkCorrelationConflict,
  formatCorrelationsTelegram,
  getCorrelationInsight
};
