/**
 * BBEMA BEDJO V2.0 - Core Strategy Module
 * Based on: Blog 2017 + PDF 2020 (Edukasi Waras Dauz Bedjo)
 * 
 * Core Concepts:
 * - EMA Tangga: 13, 18, 28 (Benteng & Trigger)
 * - BB Multi-Layer: 2.0, 2.3, 2.5 (Target & Reversal Zone)
 * - Candle Counting "Tangga": 1-3 Follow, 4-6 Reversal
 * - Session-Based: Asia 08-10, Eropa 14-17, Amerika 19-24
 * - Range-Based Targets per TF & Pair Group
 * - Stochastic (5,3,3) Filter
 * - MM Waras: Buffer 500p, Lev 1:50, Avg 10p/20p
 * - Pair Group Classification (Low/Mid/High range)
 */

const { EMA, BollingerBands, Stochastic } = require('technicalindicators');
const chalk = require('chalk');

const STRATEGY_CONFIG = {
  EMA_TANGGA: [13, 18, 28],
  BB_PERIOD: 20,
  BB_DEV: [2.0, 2.3, 2.5],
  STOCH: { period: 5, signalPeriod: 3, smoothPeriod: 3 },
  TANGGA: {
    FOLLOW_MAX: 3,
    REVERSAL_MIN: 4,
    REVERSAL_MAX: 6,
    EXTREME: 6
  },
  SESSIONS: {
    ASIA:    { name: 'ASIA',    start: 8,  end: 10,  pairs: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY', 'CHF/JPY'], bias: 'JPY', range: '08:00-10:00 WIB' },
    EROPA:   { name: 'ERopa',   start: 14, end: 17,  pairs: ['EUR/USD', 'GBP/USD', 'EUR/JPY', 'GBP/JPY', 'USD/JPY', 'EUR/GBP', 'EUR/CHF'], bias: 'EUR/GBP', range: '14:00-17:00 WIB' },
    AMERIKA: { name: 'AMERIKA', start: 19, end: 24,  pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'XAU/USD'], bias: 'USD', range: '19:00-24:00 WIB' }
  },
  RANGE_PIPS: {
    M5:   { low: 10, high: 15 },
    M15:  { low: 15, high: 20 },
    M30:  { low: 20, high: 30 },
    H1:   { low: 30, high: 50 },
    H4:   { low: 50, high: 100 },
    D1:   { low: 60, high: 100 },
    D1_HIGH: { low: 100, high: 200 },
    W1:   { low: 130, high: 250 },
    MN:   { low: 400, high: 600 }
  },
  PAIR_GROUPS: {
    LOW:   ['EUR/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD'],
    MID:   ['EUR/JPY', 'EUR/GBP', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD'],
    HIGH:  ['GBP/USD', 'GBP/JPY', 'XAU/USD']
  },
  AVG_DISTANCE: {
    ASIA: 10,
    EROPA: 20,
    AMERIKA: 20
  },
  MM: {
    BUFFER_PIPS: 500,
    MAX_LEVERAGE: 50,
    MAX_LOT_PER_200USD: 0.04,
    MAX_DAILY_TRADES: 3,
    RISK_PER_TRADE_PCT: 1.0
  }
};

function getPairGroup(pair) {
  for (const [group, pairs] of Object.entries(STRATEGY_CONFIG.PAIR_GROUPS)) {
    if (pairs.includes(pair)) return group;
  }
  return 'LOW';
}

function getCurrentSession() {
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  
  for (const [key, sess] of Object.entries(STRATEGY_CONFIG.SESSIONS)) {
    if (wibHour >= sess.start && wibHour < sess.end) {
      return { name: sess.name, range: sess.range, bias: sess.bias, focus: sess.pairs, hour: wibHour };
    }
  }
  return { name: 'CLOSED', range: '--', bias: 'NONE', focus: [], hour: wibHour };
}

function isInTradingSession(pair) {
  const session = getCurrentSession();
  if (session.name === 'CLOSED') return false;
  return session.focus.includes(pair);
}

function getRangeForTF(tf, pairGroup) {
  const ranges = STRATEGY_CONFIG.RANGE_PIPS;
  const key = pairGroup === 'HIGH' && tf === 'D1' ? 'D1_HIGH' : tf;
  return ranges[key] || ranges.H1;
}

function pipValue(pair) {
  if (pair.includes('JPY')) return 0.01;
  if (pair === 'XAU/USD') return 0.1;
  return 0.0001;
}

function pipsToPrice(pair, pips) {
  return pips * pipValue(pair);
}

function calculateIndicators(prices, highs, lows) {
  const cfg = STRATEGY_CONFIG;
  
  const ema13 = EMA.calculate({ period: 13, values: prices });
  const ema18 = EMA.calculate({ period: 18, values: prices });
  const ema28 = EMA.calculate({ period: 28, values: prices });
  
  const bb20 = BollingerBands.calculate({ period: cfg.BB_PERIOD, values: prices, stdDev: 2.0 });
  const bb23 = BollingerBands.calculate({ period: cfg.BB_PERIOD, values: prices, stdDev: 2.3 });
  const bb25 = BollingerBands.calculate({ period: cfg.BB_PERIOD, values: prices, stdDev: 2.5 });
  
  const stochInput = { 
    high: highs, 
    low: lows, 
    close: prices, 
    period: cfg.STOCH.period, 
    signalPeriod: cfg.STOCH.signalPeriod,
    smoothPeriod: cfg.STOCH.smoothPeriod
  };
  const stoch = Stochastic.calculate(stochInput);
  
  const last = prices.length - 1;
  
  return {
    price: prices[last],
    ema: {
      e13: ema13[ema13.length - 1],
      e18: ema18[ema18.length - 1],
      e28: ema28[ema28.length - 1],
      bullAlign: ema13[ema13.length - 1] > ema18[ema18.length - 1] && ema18[ema18.length - 1] > ema28[ema28.length - 1],
      bearAlign: ema13[ema13.length - 1] < ema18[ema18.length - 1] && ema18[ema18.length - 1] < ema28[ema28.length - 1],
      widening: Math.abs(ema13[ema13.length - 1] - ema28[ema28.length - 1]) > Math.abs(ema13[ema13.length - 2] - ema28[ema28.length - 2])
    },
    bb: {
      bb20: { upper: bb20[bb20.length - 1].upper, middle: bb20[bb20.length - 1].middle, lower: bb20[bb20.length - 1].lower },
      bb23: { upper: bb23[bb23.length - 1].upper, middle: bb23[bb23.length - 1].middle, lower: bb23[bb23.length - 1].lower },
      bb25: { upper: bb25[bb25.length - 1].upper, middle: bb25[bb25.length - 1].middle, lower: bb25[bb25.length - 1].lower }
    },
    stoch: stoch[stoch.length - 1] ? { k: stoch[stoch.length - 1].k, d: stoch[stoch.length - 1].d } : { k: 50, d: 50 },
    timestamp: Date.now()
  };
}

/**
 * Candle Counting "Tangga" Logic:
 * - Candle "bertangga" = body/wick melewati high/low candle sebelumnya
 * - UP trend: count candle yang high > high sebelumnya
 * - DOWN trend: count candle yang low < low sebelumnya
 * - Sejajar/selisih kecil (< 2 pips) = tidak dihitung
 * - Hanya mulai hitung setelah candle close melewati EMA13 dan mulai menjauh
 */
function countTangga(candles, htfDirection, emas) {
  if (!candles || candles.length < 20) return { count: 0, phase: 'NONE', aboveEMA: false, belowEMA: false, direction: htfDirection, detail: [] };
  
  const lastClose = candles[candles.length - 1].close;
  const aboveEMA = lastClose > emas.e13 && lastClose > emas.e18 && lastClose > emas.e28;
  const belowEMA = lastClose < emas.e13 && lastClose < emas.e18 && lastClose < emas.e28;
  
  // Determine direction from HTF
  let direction = htfDirection;
  if (direction === 'NEUTRAL') {
    direction = aboveEMA ? 'UP' : belowEMA ? 'DOWN' : 'RANGE';
  }
  
  // Need at least 20 candles to count properly
  const recent = candles.slice(-30);
  let count = 0;
  let prevHigh = -Infinity;
  let prevLow = Infinity;
  let started = false;
  const detail = [];
  
  for (let i = 0; i < recent.length; i++) {
    const c = recent[i];
    const isLast = i === recent.length - 1;
    
    if (direction === 'UP') {
      if (!started) {
        // Start counting when price breaks above EMA13 and makes higher high
        if (c.close > emas.e13 && c.high > prevHigh && prevHigh !== -Infinity) {
          started = true;
        }
        prevHigh = Math.max(prevHigh, c.high);
        if (!started) continue;
      }
      
      if (c.high > prevHigh + 0.0002) { // min 2 pip difference
        count++;
        detail.push({ idx: i, type: 'STEP_UP', high: c.high, count });
        prevHigh = c.high;
      }
    } 
    else if (direction === 'DOWN') {
      if (!started) {
        // Start counting when price breaks below EMA13 and makes lower low
        if (c.close < emas.e13 && c.low < prevLow && prevLow !== Infinity) {
          started = true;
        }
        prevLow = Math.min(prevLow, c.low);
        if (!started) continue;
      }
      
      if (c.low < prevLow - 0.0002) {
        count++;
        detail.push({ idx: i, type: 'STEP_DOWN', low: c.low, count });
        prevLow = c.low;
      }
    }
  }
  
  // Determine Phase
  let phase = 'NONE';
  if (count >= 1 && count <= 3) phase = 'FOLLOW';
  else if (count >= 4 && count <= 6) phase = 'REVERSAL';
  else if (count > 6) phase = 'EXTREME';
  
  return { count, phase, direction, aboveEMA, belowEMA, detail, started };
}

function generateSignal(indicators, tangga, tf, pair, equityUSD) {
  const { price, ema, bb, stoch } = indicators;
  const { count, phase, aboveEMA, belowEMA, direction } = tangga;
  const pairGroup = getPairGroup(pair);
  const range = getRangeForTF(tf, pairGroup);
  
  let signal = 'WAIT';
  let entryType = 'NONE';
  let entryPrice = price;
  let sl = 0, tp1 = 0, tp2 = 0, tp3 = 0;
  let reason = '';
  let confidence = 0;
  
  const stochOB = stoch.k > 80 && stoch.d > 80;
  const stochOS = stoch.k < 20 && stoch.d < 20;
  const stochCrossUp = stoch.k > stoch.d && stoch.k < 30;
  const stochCrossDown = stoch.k < stoch.d && stoch.k > 70;
  
  // --- REVERSAL ENTRY (Tangga 4-6) ---
  if (phase === 'REVERSAL') {
    // BUY Reversal: Downtrend -> Tangga 4-6 -> Stoch OS -> Price at BB23 Lower
    if (belowEMA && count >= 4 && count <= 6) {
      const inRevZone = price <= bb.bb23.lower * 1.001 && price >= bb.bb25.lower * 0.999;
      if (inRevZone && (stochOS || stochCrossUp)) {
        signal = 'BUY';
        entryType = 'REVERSAL_BUY';
        entryPrice = price;
        sl = price - pipsToPrice(pair, range.low * 1.5);
        tp1 = ema.e13;
        tp2 = ema.e18;
        tp3 = bb.bb20.middle;
        reason = `Reversal Buy: Tangga ${count} (4-6), Stoch OS, Harga di BB 2.3 Lower`;
        confidence = 85;
      }
    }
    // SELL Reversal: Uptrend -> Tangga 4-6 -> Stoch OB -> Price at BB23 Upper
    else if (aboveEMA && count >= 4 && count <= 6) {
      const inRevZone = price >= bb.bb23.upper * 0.999 && price <= bb.bb25.upper * 1.001;
      if (inRevZone && (stochOB || stochCrossDown)) {
        signal = 'SELL';
        entryType = 'REVERSAL_SELL';
        entryPrice = price;
        sl = price + pipsToPrice(pair, range.low * 1.5);
        tp1 = ema.e13;
        tp2 = ema.e18;
        tp3 = bb.bb20.middle;
        reason = `Reversal Sell: Tangga ${count} (4-6), Stoch OB, Harga di BB 2.3 Upper`;
        confidence = 85;
      }
    }
  }
  
  // --- FOLLOW ENTRY (Tangga 1-3) ---
  else if (phase === 'FOLLOW' && ema.widening) {
    // BUY Follow: Uptrend, Tangga 1-3, Pullback ke EMA13/18
    if (aboveEMA && ema.bullAlign && count >= 1 && count <= 3) {
      const nearEMA = price <= ema.e13 * 1.001 && price >= ema.e13 * 0.999;
      if (nearEMA && (stochCrossUp || stoch.k > stoch.d)) {
        signal = 'BUY';
        entryType = 'FOLLOW_BUY';
        entryPrice = price;
        sl = price - pipsToPrice(pair, range.low);
        tp1 = bb.bb20.upper;
        tp2 = bb.bb23.upper;
        tp3 = bb.bb25.upper;
        reason = `Follow Buy: Tangga ${count} (1-3), Pullback ke EMA13, EMA Bullish Align`;
        confidence = 75;
      }
    }
    // SELL Follow: Downtrend, Tangga 1-3, Pullback ke EMA13/18
    else if (belowEMA && ema.bearAlign && count >= 1 && count <= 3) {
      const nearEMA = price >= ema.e13 * 0.999 && price <= ema.e13 * 1.001;
      if (nearEMA && (stochCrossDown || stoch.k < stoch.d)) {
        signal = 'SELL';
        entryType = 'FOLLOW_SELL';
        entryPrice = price;
        sl = price + pipsToPrice(pair, range.low);
        tp1 = bb.bb20.lower;
        tp2 = bb.bb23.lower;
        tp3 = bb.bb25.lower;
        reason = `Follow Sell: Tangga ${count} (1-3), Pullback ke EMA13, EMA Bearish Align`;
        confidence = 75;
      }
    }
  }
  
  // --- EXTREME WARNING (>6 Tangga) ---
  if (phase === 'EXTREME') {
    signal = 'WAIT';
    reason = `EXTREME: Tangga ${count} > 6. Cek TF Atas. Jangan Lawan.`;
    confidence = 95;
  }
  
  // No valid setup found
  if (signal === 'WAIT' && reason === '') {
    const pos = price >= bb.bb20.upper ? 'BB_UPPER' : price <= bb.bb20.lower ? 'BB_LOWER' : 
                price > ema.e13 ? 'ABOVE_EMA13' : price < ema.e13 ? 'BELOW_EMA13' : 'MID';
    reason = `No setup: Phase=${phase}, Count=${count}, Dir=${direction}, Pos=${pos}, Stoch=${stoch.k.toFixed(0)}/${stoch.d.toFixed(0)}`;
  }
  
  return {
    signal,
    entryType,
    entryPrice: entryPrice.toFixed(5),
    sl: sl ? sl.toFixed(5) : 'N/A',
    tp1: tp1 ? tp1.toFixed(5) : 'N/A',
    tp2: tp2 ? tp2.toFixed(5) : 'N/A',
    tp3: tp3 ? tp3.toFixed(5) : 'N/A',
    reason,
    confidence,
    tanggaCount: count,
    tanggaPhase: phase,
    stochK: stoch.k.toFixed(2),
    stochD: stoch.d.toFixed(2),
    bbZone: getBBZone(price, bb),
    emaAlignment: ema.bullAlign ? 'BULLISH' : ema.bearAlign ? 'BEARISH' : 'MIXED',
    rangeUsed: `${range.low}-${range.high} pip`,
    pairGroup,
    tf
  };
}

function getBBZone(price, bb) {
  if (price >= bb.bb25.upper) return 'BB25_UPPER_EXTREME';
  if (price >= bb.bb23.upper) return 'BB23_UPPER_REV_ZONE';
  if (price >= bb.bb20.upper) return 'BB20_UPPER_TARGET';
  if (price >= bb.bb20.middle) return 'BB_MID_UPPER';
  if (price >= bb.bb20.lower) return 'BB_MID_LOWER';
  if (price >= bb.bb23.lower) return 'BB23_LOWER_REV_ZONE';
  if (price >= bb.bb25.lower) return 'BB25_LOWER_EXTREME';
  return 'BB25_LOWER_EXTREME';
}

// ========== MONEY MANAGEMENT CALCULATOR ==========

function calculateMM(signal, slPrice, entryPrice, pair, equityUSD) {
  const cfg = STRATEGY_CONFIG.MM;
  const pairGroup = getPairGroup(pair);
  const session = getCurrentSession();
  
  // Handle WAIT signal
  if (signal === 'WAIT' || !slPrice || !entryPrice) {
    return { 
      recommendedLot: 0.01, 
      slPips: 0, 
      avgDistance: 0, 
      avgPlan: [], 
      maxDrawdownPips: 0, 
      bufferPips: cfg.BUFFER_PIPS, 
      bufferOK: false, 
      warning: 'No valid signal/SL' 
    };
  }
  
  const maxLot = (equityUSD / 200) * cfg.MAX_LOT_PER_200USD;
  const riskAmount = equityUSD * (cfg.RISK_PER_TRADE_PCT / 100);
  
  const slDistPrice = Math.abs(entryPrice - slPrice);
  const slPips = slDistPrice / pipValue(pair);
  
  let lot = 0;
  if (pair === 'XAU/USD') {
    lot = riskAmount / (slPips * 100);
  } else if (pair.includes('JPY')) {
    lot = riskAmount / (slPips * 9.5);
  } else {
    lot = riskAmount / (slPips * 10);
  }
  
  lot = Math.min(lot, maxLot);
  lot = Math.floor(lot * 100) / 100;
  if (lot < 0.01) lot = 0.01;
  
  const avgDist = STRATEGY_CONFIG.AVG_DISTANCE[session.name] || 20;
  const avgPlan = [];
  for (let i = 1; i <= 3; i++) {
    const avgPrice = signal === 'BUY' 
      ? entryPrice - pipsToPrice(pair, avgDist * i)
      : entryPrice + pipsToPrice(pair, avgDist * i);
    avgPlan.push({
      step: i,
      price: avgPrice.toFixed(5),
      lot: lot,
      distPips: avgDist * i
    });
  }
  
  const totalDrawdownPips = avgPlan[avgPlan.length - 1].distPips + slPips;
  const bufferOK = totalDrawdownPips <= cfg.BUFFER_PIPS;
  
  return {
    equity: equityUSD,
    maxLot,
    recommendedLot: lot,
    riskAmount: riskAmount.toFixed(2),
    slPips: slPips.toFixed(1),
    avgDistance: avgDist,
    avgPlan,
    totalAvgSteps: avgPlan.length,
    maxDrawdownPips: totalDrawdownPips.toFixed(1),
    bufferPips: cfg.BUFFER_PIPS,
    bufferOK,
    leverage: cfg.MAX_LEVERAGE,
    warning: !bufferOK ? `⚠️ DRAWDOWN ${totalDrawdownPips.toFixed(0)}p > BUFFER 500p! Kurangi Lot atau SL.` : '✅ Buffer Aman'
  };
}

// ========== MAIN ANALYSIS FUNCTION ==========

async function analyzeBBEMA(pair, candles, equityUSD = 500) {
  if (!candles || candles.length < 50) return { error: 'Insufficient candle data (min 50)' };
  
  const prices = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const pairGroup = getPairGroup(pair);
  
  const indicators = calculateIndicators(prices, highs, lows, pair);
  const session = getCurrentSession();
  const htfDirection = indicators.ema.bullAlign ? 'UP' : indicators.ema.bearAlign ? 'DOWN' : 'NEUTRAL';
  const tangga = countTangga(candles.slice(-30), htfDirection, indicators.ema);
  const signal = generateSignal(indicators, tangga, 'H1', pair, equityUSD);
  const entryPrice = parseFloat(signal.entryPrice);
  const slPrice = signal.sl !== 'N/A' ? parseFloat(signal.sl) : 0;
  const mm = calculateMM(signal.signal, slPrice, entryPrice, pair, equityUSD);
  
  return {
    pair,
    timestamp: new Date().toISOString(),
    session: session.name,
    sessionOK: isInTradingSession(pair),
    sessionBias: session.bias,
    price: indicators.price.toFixed(5),
    ema: indicators.ema,
    bb: indicators.bb,
    stoch: indicators.stoch,
    tangga: { count: tangga.count, phase: tangga.phase, direction: tangga.direction, aboveEMA: tangga.aboveEMA, belowEMA: tangga.belowEMA },
    signal: signal.signal,
    entryType: signal.entryType,
    entryPrice: signal.entryPrice,
    sl: signal.sl,
    tp1: signal.tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    reason: signal.reason,
    confidence: signal.confidence,
    mm,
    pairGroup,
    rangeRef: signal.rangeUsed
  };
}

async function analyzeMultiTFBBEMA(pair, tfCandles, equityUSD = 500) {
  const results = {};
  const tfs = ['M5', 'M15', 'H1', 'H4', 'D1'];
  
  // Get HTF direction first (D1)
  let htfDirection = 'NEUTRAL';
  if (tfCandles.D1 && tfCandles.D1.length > 50) {
    const d1Prices = tfCandles.D1.map(c => c.close);
    const d1Highs = tfCandles.D1.map(c => c.high);
    const d1Lows = tfCandles.D1.map(c => c.low);
    const d1Ind = calculateIndicators(d1Prices, d1Highs, d1Lows);
    htfDirection = d1Ind.ema.bullAlign ? 'UP' : d1Ind.ema.bearAlign ? 'DOWN' : 'NEUTRAL';
  }
  
  for (const tf of tfs) {
    if (tfCandles[tf] && tfCandles[tf].length >= 50) {
      results[tf] = await analyzeBBEMA(pair, tfCandles[tf], equityUSD);
      results[tf].tf = tf;
    }
  }
  
  // Overall Decision
  const h1 = results.H1 || results.M15;
  const h4 = results.H4;
  const d1 = results.D1;
  
  let decision = 'WAIT';
  let decisionReason = 'Tidak ada sinyal jelas';
  let ltfSignal = 'WAIT';
  
  if (h1 && h1.signal !== 'WAIT') {
    ltfSignal = h1.signal;
    decision = h1.signal;
    decisionReason = `LTF Trigger: ${h1.signal} (${h1.entryType}, Tangga ${h1.tangga ? h1.tangga.count : '-'})`;
  } else if (htfDirection === 'UP') {
    decision = 'BUY';
    decisionReason = 'HTF Bullish - Wait Pullback to EMA13 for Follow';
  } else if (htfDirection === 'DOWN') {
    decision = 'SELL';
    decisionReason = 'HTF Bearish - Wait Pullback to EMA13 for Follow';
  }
  
  return {
    pair,
    timestamp: new Date().toISOString(),
    htfBias: htfDirection,
    ltfSignal,
    decision,
    decisionReason,
    timeframes: results,
    session: getCurrentSession(),
    equity: equityUSD
  };
}

// ========== NEWS SENTIMENT FILTER ==========

function applyNewsFilter(bbemaSignal, aiSentiment) {
  if (!aiSentiment || bbemaSignal === 'WAIT') return { signal: bbemaSignal, filtered: false, confidence: 0 };
  
  const rating = aiSentiment.rating;
  const sentiment = aiSentiment.sentiment;
  
  let filterResult = { signal: bbemaSignal, filtered: false, confidence: 0 };
  
  // If BBEMA says BUY but AI says BEARISH, filter out
  if (bbemaSignal === 'BUY' && rating < 45) {
    filterResult = { signal: 'WAIT', filtered: true, confidence: -20, reason: `AI BEARISH (${rating}/100) contradicts BBEMA BUY` };
  }
  // If BBEMA says SELL but AI says BULLISH, filter out
  else if (bbemaSignal === 'SELL' && rating > 55) {
    filterResult = { signal: 'WAIT', filtered: true, confidence: -20, reason: `AI BULLISH (${rating}/100) contradicts BBEMA SELL` };
  }
  // If signals align, boost confidence
  else if (bbemaSignal === 'BUY' && rating > 55) {
    filterResult = { signal: bbemaSignal, filtered: false, confidence: 20, reason: `AI BULLISH (${rating}/100) confirms BBEMA BUY` };
  }
  else if (bbemaSignal === 'SELL' && rating < 45) {
    filterResult = { signal: bbemaSignal, filtered: false, confidence: 20, reason: `AI BEARISH (${rating}/100) confirms BBEMA SELL` };
  }
  
  return filterResult;
}

function analyzeWithSentimentFilter(pair, bbemaResult, sentimentResult) {
  const bbemaSignal = bbemaResult.decision;
  const aiSentiment = sentimentResult?.sentiment;
  
  if (!aiSentiment) return { ...bbemaResult, sentimentFilter: null };
  
  const filter = applyNewsFilter(bbemaSignal, aiSentiment);
  
  let finalDecision = bbemaResult.decision;
  let finalReason = bbemaResult.decisionReason;
  
  if (filter.filtered) {
    finalDecision = filter.signal;
    finalReason = `[FILTERED] ${filter.reason}`;
  } else if (filter.confidence > 0) {
    finalReason = `${finalReason} [AI CONFIRMED: ${filter.reason}]`;
  }
  
  return {
    ...bbemaResult,
    decision: finalDecision,
    decisionReason: finalReason,
    sentimentFilter: {
      aiRating: aiSentiment.rating,
      aiSentiment: aiSentiment.sentiment,
      filterApplied: filter.filtered,
      confidenceBoost: filter.confidence,
      filterReason: filter.reason || null
    }
  };
}

module.exports = {
  STRATEGY_CONFIG,
  analyzeBBEMA,
  analyzeMultiTFBBEMA,
  getCurrentSession,
  isInTradingSession,
  getPairGroup,
  getRangeForTF,
  calculateMM,
  countTangga,
  calculateIndicators,
  generateSignal,
  applyNewsFilter,
  analyzeWithSentimentFilter
};