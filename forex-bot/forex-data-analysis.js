const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');
const chalk = require('chalk');

const FOREX_SYMBOLS = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'USD/CHF': 'USDCHF=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X',
  'XAU/USD': 'GC=F'
};

const TIMEFRAMES = {
  '1D': { period1: '2024-01-01', interval: '1d' },
  '1W': { period1: '2023-01-01', interval: '1wk' },
  '1M': { period1: '2020-01-01', interval: '1mo' }
};

async function getHistoricalData(symbol, timeframe = '1D') {
  try {
    const yahooSymbol = FOREX_SYMBOLS[symbol] || symbol;
    const tf = TIMEFRAMES[timeframe] || TIMEFRAMES['1D'];
    
    const result = await yahooFinance.chart(yahooSymbol, {
      period1: tf.period1,
      interval: tf.interval
    });
    
    const quotes = result.quotes || [];
    return quotes.slice(-100);
  } catch (error) {
    console.error(chalk.red(`Error fetching data for ${symbol}:`), error.message);
    return [];
  }
}

function calculateIndicators(prices, highs, lows) {
  const sma20 = SMA.calculate({ period: 20, values: prices });
  const sma50 = SMA.calculate({ period: 50, values: prices });
  const ema9 = EMA.calculate({ period: 9, values: prices });
  const ema21 = EMA.calculate({ period: 21, values: prices });
  
  const rsi = RSI.calculate({ period: 14, values: prices });
  
  const macd = MACD.calculate({
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  
  const bb = BollingerBands.calculate({
    period: 20,
    values: prices,
    stdDev: 2
  });
  
  const stoch = Stochastic.calculate({
    high: highs,
    low: lows,
    close: prices,
    period: 14,
    signalPeriod: 3
  });
  
  return {
    sma20: sma20.slice(-1)[0],
    sma50: sma50.slice(-1)[0],
    ema9: ema9.slice(-1)[0],
    ema21: ema21.slice(-1)[0],
    rsi: rsi.slice(-1)[0],
    macd: macd.slice(-1)[0],
    bb: bb.slice(-1)[0],
    stoch: stoch.slice(-1)[0]
  };
}

function analyzeTrend(prices, indicators) {
  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  const change = ((lastPrice - prevPrice) / prevPrice) * 100;
  
  let trend = 'NEUTRAL';
  let strength = 0;
  
  if (indicators.sma20 && indicators.sma50) {
    if (lastPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      trend = 'UPTREND';
      strength = Math.min(100, 50 + (lastPrice - indicators.sma20) / indicators.sma20 * 1000);
    } else if (lastPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      trend = 'DOWNTREND';
      strength = Math.min(100, 50 + (indicators.sma20 - lastPrice) / indicators.sma20 * 1000);
    }
  }
  
  return {
    trend,
    strength: Math.round(strength),
    change: change.toFixed(2),
    lastPrice: lastPrice.toFixed(5)
  };
}

function generateSignals(indicators, trend) {
  const signals = [];
  
  if (indicators.rsi < 30) {
    signals.push({ type: 'BUY', reason: 'RSI Oversold (< 30)', strength: 'STRONG' });
  } else if (indicators.rsi > 70) {
    signals.push({ type: 'SELL', reason: 'RSI Overbought (> 70)', strength: 'STRONG' });
  }
  
  if (indicators.stoch && indicators.stoch.k < 20) {
    signals.push({ type: 'BUY', reason: 'Stochastic Oversold', strength: 'MEDIUM' });
  } else if (indicators.stoch && indicators.stoch.k > 80) {
    signals.push({ type: 'SELL', reason: 'Stochastic Overbought', strength: 'MEDIUM' });
  }
  
  if (indicators.bb) {
    const lastPrice = indicators.bb.upper;
    if (indicators.bb.upper && indicators.bb.lower) {
      signals.push({ type: 'INFO', reason: `BB Range: ${indicators.bb.lower.toFixed(5)} - ${indicators.bb.upper.toFixed(5)}`, strength: 'INFO' });
    }
  }
  
  if (indicators.macd) {
    if (indicators.macd.MACD > indicators.macd.signal) {
      signals.push({ type: 'BUY', reason: 'MACD Bullish Cross', strength: 'MEDIUM' });
    } else {
      signals.push({ type: 'SELL', reason: 'MACD Bearish Cross', strength: 'MEDIUM' });
    }
  }
  
  return signals;
}

async function analyzePair(pair, timeframe = '1D') {
  const data = await getHistoricalData(pair, timeframe);
  
  if (data.length === 0) {
    return { error: 'No data available' };
  }
  
  const prices = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const indicators = calculateIndicators(prices, highs, lows);
  const trend = analyzeTrend(prices, indicators);
  const signals = generateSignals(indicators, trend);
  
  const buySignals = signals.filter(s => s.type === 'BUY').length;
  const sellSignals = signals.filter(s => s.type === 'SELL').length;
  
  let recommendation = 'WAIT';
  if (buySignals > sellSignals && trend.trend === 'UPTREND') recommendation = 'BUY';
  else if (sellSignals > buySignals && trend.trend === 'DOWNTREND') recommendation = 'SELL';
  
  return {
    pair,
    timeframe,
    dataPoints: data.length,
    trend,
    indicators: {
      rsi: indicators.rsi ? indicators.rsi.toFixed(2) : 'N/A',
      macd: indicators.macd ? {
        macd: indicators.macd.MACD.toFixed(5),
        signal: indicators.macd.signal.toFixed(5),
        histogram: indicators.macd.histogram.toFixed(5)
      } : 'N/A',
      stoch: indicators.stoch ? {
        k: indicators.stoch.k.toFixed(2),
        d: indicators.stoch.d.toFixed(2)
      } : 'N/A',
      bb: indicators.bb ? {
        upper: indicators.bb.upper.toFixed(5),
        middle: indicators.bb.middle.toFixed(5),
        lower: indicators.bb.lower.toFixed(5)
      } : 'N/A'
    },
    signals,
    recommendation,
    summary: {
      buySignals,
      sellSignals,
      neutralSignals: signals.filter(s => s.type === 'INFO').length
    }
  };
}

function formatAnalysisMessage(pair, analysis) {
  if (analysis.error) {
    return `❌ <b>Error:</b> ${analysis.error}`;
  }
  
  const emoji = analysis.recommendation === 'BUY' ? '🟢' : analysis.recommendation === 'SELL' ? '🔴' : '🟡';
  const trendEmoji = analysis.trend.trend === 'UPTREND' ? '📈' : analysis.trend.trend === 'DOWNTREND' ? '📉' : '➡️';
  
  let msg = `📊 <b>FOREX DATA ANALYSIS</b>\n`;
  msg += `by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
  msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
  
  msg += `${emoji} <b>${pair}</b> - ${analysis.timeframe}\n`;
  msg += `${trendEmoji} Trend: <b>${analysis.trend.trend}</b> (${analysis.trend.strength}%)\n`;
  msg += `💰 Price: <b>${analysis.trend.lastPrice}</b> (${analysis.trend.change}%)\n\n`;
  
  msg += `📉 <b>INDICATORS:</b>\n`;
  msg += `• RSI: ${analysis.indicators.rsi}\n`;
  if (analysis.indicators.stoch !== 'N/A') {
    msg += `• Stochastic: K=${analysis.indicators.stoch.k} D=${analysis.indicators.stoch.d}\n`;
  }
  if (analysis.indicators.bb !== 'N/A') {
    msg += `• BB: ${analysis.indicators.bb.lower} - ${analysis.indicators.bb.upper}\n`;
  }
  if (analysis.indicators.macd !== 'N/A') {
    msg += `• MACD: ${analysis.indicators.macd.macd}\n`;
  }
  
  msg += `\n📊 <b>SIGNALS:</b>\n`;
  analysis.signals.forEach(signal => {
    const sigEmoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '🔵';
    msg += `${sigEmoji} ${signal.reason} (${signal.strength})\n`;
  });
  
  msg += `\n🎯 <b>RECOMMENDATION:</b> ${analysis.recommendation}\n`;
  msg += `✅ Buy: ${analysis.summary.buySignals} | ❌ Sell: ${analysis.summary.sellSignals} | ⏸️ Neutral: ${analysis.summary.neutralSignals}\n`;
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  
  return msg;
}

module.exports = {
  analyzePair,
  formatAnalysisMessage,
  getHistoricalData,
  FOREX_SYMBOLS
};
