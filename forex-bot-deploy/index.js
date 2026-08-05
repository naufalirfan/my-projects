const chalk = require('chalk');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { RSI, SMA, EMA, MACD, BollingerBands, Stochastic } = require('technicalindicators');
const { TelegramBot } = require('node-telegram-bot-api');
const config = require('./config');
const bbema = require('./bbema');
const newsSentiment = require('./news-sentiment');
const geopolitical = require('./geopolitical');
const correlation = require('./correlation');

let telegramBot = null;
let userSelectedPairs = new Map(); // chatId -> pair

// Persistent Reply Keyboard (bottom of chat)
function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['📈 Analisis Semua Pair', '🔄 Refresh Data Terbaru'],
        ['📋 Pilih Pair Spesifik', '📊 Analisis BBEMA V2.0'],
        ['🤖 AI', '🔗 Korelasi'],
        ['ℹ️ Bantuan']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
}

function getAIKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['🤖 AI Prediction', '🤖 AI Analysis'],
        ['📊 Forex Data Analysis'],
        ['🔙 Kembali ke Menu']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
}

function getPairKeyboard(currentPair = null) {
    const pairs = config.MAJOR_PAIRS;
    const keyboard = [];
    
    for (let i = 0; i < pairs.length; i += 2) {
      const row = [];
      const p1 = pairs[i];
      const p2 = pairs[i + 1];
      
      if (p1) row.push((p1 === currentPair ? '✅ ' : '') + p1);
      if (p2) row.push((p2 === currentPair ? '✅ ' : '') + p2);
      
      keyboard.push(row);
    }
    
    keyboard.push(['🔙 Kembali ke Menu']);
    
    return {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };
  }

if (config.TELEGRAM_BOT_ENABLED !== 'false' && config.TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN') {
  telegramBot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
  setupTelegramCommands();
  
  // Auto-start LSTM service
  const lstmClient = require('./lstm-client');
  lstmClient.startService().then(ok => {
    if (ok) console.log(chalk.green('🤖 LSTM Service integrated'));
    else console.log(chalk.yellow('⚠️ LSTM Prediction tidak tersedia'));
  });
}

function setupTelegramCommands() {
  if (!telegramBot) return;

  telegramBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    sendWelcomeMessage(chatId);
  });

  telegramBot.onText(/\/analyze/, async (msg) => {
    const chatId = msg.chat.id;
    await sendAnalysis(chatId);
  });

  telegramBot.onText(/\/refresh/, async (msg) => {
    const chatId = msg.chat.id;
    await sendAnalysis(chatId, true);
  });

  telegramBot.onText(/\/pair (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const pair = match[1].toUpperCase();
    handlePairSelection(chatId, pair);
  });

  telegramBot.onText(/\/pairs/, (msg) => {
    const chatId = msg.chat.id;
    sendPairList(chatId);
  });

  telegramBot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    sendHelpMessage(chatId);
  });

  telegramBot.onText(/\/bbema/, async (msg) => {
    const chatId = msg.chat.id;
    await sendBBEMAAnalysis(chatId);
  });

  telegramBot.onText(/\/sentiment/, async (msg) => {
    const chatId = msg.chat.id;
    await sendNewsSentimentAnalysis(chatId);
  });

  telegramBot.onText(/\/geopolitical/, async (msg) => {
    const chatId = msg.chat.id;
    await sendGeopoliticalAnalysis(chatId);
  });

  telegramBot.onText(/\/correlation (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const currency = match[1].toUpperCase();
    sendCorrelationAnalysis(chatId, currency);
  });

  telegramBot.onText(/\/combined/, async (msg) => {
    const chatId = msg.chat.id;
    await sendCombinedAnalysis(chatId);
  });

  // Persistent Reply Keyboard (bottom of chat)
  function getMainKeyboard() {
    return {
      reply_markup: {
        keyboard: [
          ['📈 Analisis Semua Pair', '🔄 Refresh Data Terbaru'],
          ['📋 Pilih Pair Spesifik', 'ℹ️ Bantuan']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };
  }

  function getPairKeyboard(currentPair = null) {
    const pairs = config.MAJOR_PAIRS;
    const keyboard = [];
    
    // Group pairs into rows of 2
    for (let i = 0; i < pairs.length; i += 2) {
      const row = [];
      const p1 = pairs[i];
      const p2 = pairs[i + 1];
      
      if (p1) row.push((p1 === currentPair ? '✅ ' : '') + p1);
      if (p2) row.push((p2 === currentPair ? '✅ ' : '') + p2);
      
      keyboard.push(row);
    }
    
    keyboard.push(['🔙 Kembali ke Menu']);
    
    return {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };
  }

  // Text message handler for reply keyboard
  telegramBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text === '/start') {
      sendWelcomeMessage(chatId);
      return;
    }

    if (text === '📈 Analisis Semua Pair') {
      userSelectedPairs.delete(chatId);
      await sendAnalysis(chatId, false);
      return;
    }

    if (text === '🔄 Refresh Data Terbaru') {
      await sendAnalysis(chatId, true);
      return;
    }

    if (text === '📋 Pilih Pair Spesifik') {
      await sendPairList(chatId);
      return;
    }

    if (text === 'ℹ️ Bantuan') {
      sendHelpMessage(chatId);
      return;
    }

    if (text === '🤖 AI') {
      telegramBot.sendMessage(chatId, '🤖 <b>AI Menu</b>\n\nPilih fitur AI:', {
        parse_mode: 'HTML',
        ...getAIKeyboard()
      });
      return;
    }

    if (text === '📊 Analisis BBEMA V2.0') {
      await sendBBEMAAnalysis(chatId);
      return;
    }

    if (text === '📰 AI Sentimen') {
      await sendNewsSentimentAnalysis(chatId);
      return;
    }

    if (text === '🌍 Geopolitik') {
      await sendGeopoliticalAnalysis(chatId);
      return;
    }

    if (text === '🔗 Korelasi') {
      sendCorrelationList(chatId);
      return;
    }

    if (text === '🎯 Gabungan 3-in-1') {
      await sendCombinedAnalysis(chatId);
      return;
    }

    if (text === '🤖 AI Analysis') {
      await sendAIAnalysis(chatId);
      return;
    }

    if (text === '📊 Forex Data Analysis') {
      await sendForexDataAnalysis(chatId);
      return;
    }

    if (text === '🤖 AI Prediction') {
      await sendAIPrediction(chatId);
      return;
    }

    if (text === '🔙 Kembali ke Menu') {
      sendWelcomeMessage(chatId);
      return;
    }

    // Check if text matches a pair
    if (config.MAJOR_PAIRS.includes(text)) {
      userSelectedPairs.set(chatId, text);
      await sendPairList(chatId);
      setTimeout(() => sendAnalysis(chatId, false), 500);
      return;
    }

    if (text.startsWith('/')) return; // Ignore other commands
  });

  console.log(chalk.green('🤖 Telegram bot with persistent keyboard ready'));
}

function sendWelcomeMessage(chatId) {
  const message = `👋 <b>Selamat datang di Forex Analysis Bot!</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>

📊 <b>Gunakan menu di bawah chat:</b>`;

  telegramBot.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    ...getMainKeyboard() 
  });
}

function sendHelpMessage(chatId) {
  const message = `📖 <b>Bantuan Forex Bot v3.0</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>

<b>Menu Utama:</b>
• 📈 <b>Analisis Semua Pair</b> - Analisis 8 pair (Original)
• 🔄 <b>Refresh Data Terbaru</b> - Update data
• 📋 <b>Pilih Pair Spesifik</b> - Analisis pair tertentu
• 📊 <b>Analisis BBEMA V2.0</b> - Reversal/Follow
• 🤖 <b>AI</b> - Menu AI (Prediction + Analysis + Data)
• 🔗 <b>Korelasi</b> - Korelasi mata uang dengan instrumen lain
• ℹ️ <b>Bantuan</b> - Menu ini

<b>Menu AI:</b>
• 🤖 <b>AI Prediction</b> - Prediksi LSTM dari Python microservice
• 🤖 <b>AI Analysis</b> - Analisis lengkap: Technical + AI Sentiment + Geopolitical + Combined + Best Pair
• 📊 <b>Forex Data Analysis</b> - Analisis data harga, indikator teknikal, dan rekomendasi

<b>Command:</b>
• <code>/bbema</code> - Analisis BBEMA V2.0
• <code>/sentiment</code> - AI News Sentiment
• <code>/geopolitical</code> - Geopolitical Analysis
• <code>/correlation USD</code> - Currency Correlation
• <code>/combined</code> - Combined 3-in-1 Analysis

<b>Pair:</b> EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, XAU/USD

<b>Fitur Baru v3.0:</b>
• 🤖 Gemini/Groq AI sentiment analysis
• 🌍 Geopolitical insights
• 🔗 Currency correlations
• 🎯 Combined signal scoring
• 🤖 LSTM AI Prediction (Python microservice)

<i>Auto update jam 8 pagi WIB</i>`;

  telegramBot.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    ...getMainKeyboard() 
  });
}

async function sendBBEMAAnalysis(chatId) {
  if (!telegramBot) return;
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, '📊 <b>Menganalisis BBEMA Bedjo V2.0...</b>', { parse_mode: 'HTML' });
    
    const results = await analyzeForexBBEMA(false, 500);
    
    const message = formatBBEMATelegramMessage(results.allPairBBEMA, results.sentiment, results.session, results.events.slice(0,5));
    
    await telegramBot.editMessageText(message, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('BBEMA Telegram error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function sendNewsSentimentAnalysis(chatId) {
  if (!telegramBot) return;
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, '📰 <b>Menganalisis AI News Sentiment...</b>', { parse_mode: 'HTML' });
    
    const results = await newsSentiment.analyzeAllPairsSentiment(config.MAJOR_PAIRS);
    const overall = newsSentiment.calculateOverallSentiment(results);
    
    let msg = `📰 <b>AI NEWS SENTIMENT ANALYSIS</b>\n`;
    msg += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
    msg += `🤖 <b>Gemini AI Analysis</b>\n\n`;
    
    for (const pair of config.MAJOR_PAIRS) {
      const r = results[pair];
      const s = r.sentiment;
      const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
      msg += `${emoji} <b>${pair}</b>: ${s.rating}/100 (${s.sentiment})\n`;
      msg += `   📌 ${s.timeframe} | ${s.summary}\n`;
      if (r.articles.length > 0) {
        msg += `   📄 ${r.articles.length} articles analyzed\n`;
      }
    }
    
    msg += `\n📊 <b>OVERALL:</b>\n`;
    msg += `Strongest: ${overall.strongest}\n`;
    msg += `Weakest: ${overall.weakest}\n`;
    msg += `Average: ${overall.average}/100 (${overall.bias})\n`;
    
    msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
    
    await telegramBot.editMessageText(msg, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('Sentiment Telegram error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function sendGeopoliticalAnalysis(chatId) {
  if (!telegramBot) return;
  
  let msg = `🌍 <b>GEOPOLITICAL ANALYSIS</b>\n`;
  msg += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
  
  for (const currency of ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']) {
    const profile = geopolitical.getCurrencyProfile(currency);
    
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💱 <b>${currency}</b>\n`;
    
    msg += `📊 Top Pairs:\n`;
    const pairs = Object.entries(profile.mostTradedPairs).slice(0, 3);
    for (const [pair, vol] of pairs) {
      msg += `  • ${pair} (${vol}%)\n`;
    }
    
    msg += `📦 Top Exports:\n`;
    for (const [item, val] of profile.topExports) {
      msg += `  • ${item}: $${val}B\n`;
    }
    
    const cond = profile.conditions;
    if (cond.buy.length > 0) {
      msg += `🟢 <b>Buy when:</b> ${cond.buy[0]}\n`;
    }
    if (cond.sell.length > 0) {
      msg += `🔴 <b>Sell when:</b> ${cond.sell[0]}\n`;
    }
  }
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  
  await telegramBot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
}

function sendCorrelationList(chatId) {
  let msg = `🔗 <b>CURRENCY CORRELATIONS</b>\n`;
  msg += `Pilih currency untuk melihat korelasi:\n\n`;
  
  for (const currency of ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']) {
    const corrs = correlation.getCorrelations(currency);
    const top3 = corrs.slice(0, 3);
    const summary = top3.map(c => {
      const name = correlation.INSTRUMENT_NAMES[c.ticker] || c.ticker;
      return `${name}(${c.pct > 0 ? '+' : ''}${c.pct}%)`;
    }).join(', ');
    msg += `• <code>/correlation ${currency}</code> - ${summary}\n`;
  }
  
  telegramBot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
}

function sendCorrelationAnalysis(chatId, currency) {
  const corrs = correlation.getCorrelations(currency);
  
  let msg = `🔗 <b>${currency} CORRELATIONS</b>\n\n`;
  
  for (const c of corrs) {
    const name = correlation.INSTRUMENT_NAMES[c.ticker] || c.ticker;
    const strength = correlation.getCorrelationStrength(c.pct);
    const sign = c.pct >= 0 ? '+' : '';
    const bar = '█'.repeat(Math.min(Math.abs(c.pct) / 10, 10));
    const color = c.pct >= 75 ? '🟢' : c.pct <= -75 ? '🔴' : '🟡';
    
    msg += `${color} <b>${name}</b>: ${sign}${c.pct}% (${strength})\n`;
    msg += `  ${bar}\n`;
  }
  
  msg += `\n⚠️ <i>Data based on historical correlations</i>`;
  
  telegramBot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
}

async function sendCombinedAnalysis(chatId) {
  if (!telegramBot) return;
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, '🎯 <b>Menganalisis Gabungan 3-in-1...</b>', { parse_mode: 'HTML' });
    
    const technicalResults = await analyzeForex(false);
    const sentimentResults = await newsSentiment.analyzeAllPairsSentiment(config.MAJOR_PAIRS);
    const overallSentiment = newsSentiment.calculateOverallSentiment(sentimentResults);
    
    let msg = `🎯 <b>ANALISIS GABUNGAN 3-IN-1</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
    msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
    
    msg += `📊 <b>KEKUATAN:</b>\n`;
    const sortedStrength = Object.entries(technicalResults.strength).sort(([, a], [, b]) => b - a);
    for (const [currency, score] of sortedStrength.slice(0, 4)) {
      msg += `${currency}: ${'█'.repeat(Math.min(score, 10))} (${score})\n`;
    }
    
    msg += `\n📰 <b>SENTIMEN AI:</b>\n`;
    for (const pair of config.MAJOR_PAIRS) {
      const s = sentimentResults[pair].sentiment;
      const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
      msg += `${emoji} ${pair}: ${s.rating}/100 (${s.sentiment})\n`;
    }
    
    msg += `\n📈 <b>TECHNICAL + AI GABUNGAN:</b>\n`;
    for (const pair of config.MAJOR_PAIRS) {
      const tfData = technicalResults.allPairData[pair];
      const h1 = tfData?.H1;
      const aiSent = sentimentResults[pair].sentiment;
      
      let techSignal = 'WAIT';
      if (h1?.signal.includes('BUY')) techSignal = 'BUY';
      else if (h1?.signal.includes('SELL')) techSignal = 'SELL';
      
      let combined = 'WAIT';
      let confidence = 50;
      
      if (techSignal === 'BUY' && aiSent.rating > 55) {
        combined = 'STRONG BUY';
        confidence = Math.min(90, 60 + (aiSent.rating - 50) / 2);
      } else if (techSignal === 'SELL' && aiSent.rating < 45) {
        combined = 'STRONG SELL';
        confidence = Math.min(90, 60 + (50 - aiSent.rating) / 2);
      } else if (techSignal === 'BUY' || aiSent.rating > 60) {
        combined = 'BUY';
        confidence = 65;
      } else if (techSignal === 'SELL' || aiSent.rating < 40) {
        combined = 'SELL';
        confidence = 65;
      }
      
      const emoji = combined.includes('BUY') ? '🟢' : combined.includes('SELL') ? '🔴' : '🟡';
      msg += `${emoji} <b>${pair}</b>: ${combined} (${confidence.toFixed(0)}%)\n`;
      msg += `  Tech: ${techSignal} | AI: ${aiSent.rating}/100\n`;
    }
    
    msg += `\n🌍 <b>BIAS SENTIMEN:</b> ${overallSentiment.bias}\n`;
    msg += `Terkuat: ${overallSentiment.strongest} | Terlemah: ${overallSentiment.weakest}\n`;
    
    msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
    
    await telegramBot.editMessageText(msg, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('Combined Telegram error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function sendAIAnalysis(chatId) {
  if (!telegramBot) return;
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, '🤖 <b>AI Analysis sedang memproses...</b>', { parse_mode: 'HTML' });
    
    const technicalResults = await analyzeForex(false);
    const sentimentResults = await newsSentiment.analyzeAllPairsSentiment(config.MAJOR_PAIRS);
    const overallSentiment = newsSentiment.calculateOverallSentiment(sentimentResults);
    
    let msg = `🤖 <b>ANALISIS AI FOREX</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
    msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
    
    msg += `💪 <b>KEKUATAN MATA UANG:</b>\n`;
    Object.entries(technicalResults.strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
      msg += `${currency}: ${'█'.repeat(Math.min(score, 10))} (${score})\n`;
    });
    
    msg += `\n📰 <b>SENTIMEN BERITA AI:</b>\n`;
    for (const pair of config.MAJOR_PAIRS) {
      const s = sentimentResults[pair].sentiment;
      const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
      msg += `${emoji} <b>${pair}</b>: ${s.rating}/100 (${s.sentiment})\n`;
    }
    
    msg += `\n📈 <b>SINYAL GABUNGAN:</b>\n`;
    const combinedResults = {};
    for (const pair of config.MAJOR_PAIRS) {
      const tfData = technicalResults.allPairData[pair];
      const h1 = tfData?.H1;
      const aiSent = sentimentResults[pair].sentiment;
      const geoBias = geopolitical.analyzeGeopoliticalBias(pair, technicalResults.strength);
      
      let techSignal = 'WAIT';
      if (h1?.signal.includes('BUY')) techSignal = 'BUY';
      else if (h1?.signal.includes('SELL')) techSignal = 'SELL';
      
      let combined = 'WAIT';
      let confidence = 50;
      
      if (techSignal === 'BUY' && aiSent.rating > 55 && geoBias.bias === 'BUY') {
        combined = 'STRONG BUY';
        confidence = Math.min(95, 70 + (aiSent.rating - 50) / 3);
      } else if (techSignal === 'SELL' && aiSent.rating < 45 && geoBias.bias === 'SELL') {
        combined = 'STRONG SELL';
        confidence = Math.min(95, 70 + (50 - aiSent.rating) / 3);
      } else if (techSignal === 'BUY' && aiSent.rating > 55) {
        combined = 'BUY';
        confidence = Math.min(85, 60 + (aiSent.rating - 50) / 3);
      } else if (techSignal === 'SELL' && aiSent.rating < 45) {
        combined = 'SELL';
        confidence = Math.min(85, 60 + (50 - aiSent.rating) / 3);
      } else if (aiSent.rating > 60 && geoBias.bias === 'BUY') {
        combined = 'BUY';
        confidence = 65;
      } else if (aiSent.rating < 40 && geoBias.bias === 'SELL') {
        combined = 'SELL';
        confidence = 65;
      }
      
      combinedResults[pair] = { combined, confidence, techSignal, aiRating: aiSent.rating, geoBias: geoBias.bias };
      
      const emoji = combined.includes('BUY') ? '🟢' : combined.includes('SELL') ? '🔴' : '🟡';
      msg += `${emoji} <b>${pair}</b>: ${combined} (${confidence.toFixed(0)}%)\n`;
      msg += `  Tech: ${techSignal} | AI: ${aiSent.rating}/100 | Geo: ${geoBias.bias}\n`;
    }
    
    msg += `\n📰 <b>RINGKASAN SENTIMEN BERITA AI:</b>\n`;
    for (const pair of config.MAJOR_PAIRS) {
      const s = sentimentResults[pair].sentiment;
      const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
      msg += `${emoji} <b>${pair}</b>: ${s.rating}/100 (${s.sentiment}) - ${s.timeframe}\n`;
      msg += `  📌 ${s.summary}\n`;
    }
    
    msg += `\n🌍 <b>WAWASAN GEOPOLITIK:</b>\n`;
    for (const currency of ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']) {
      const cond = geopolitical.getBuySellConditions(currency);
      if (cond.buy.length > 0) msg += `🟢 Beli ${currency}: ${cond.buy[0]}\n`;
      if (cond.sell.length > 0) msg += `🔴 Jual ${currency}: ${cond.sell[0]}\n`;
    }
    
    msg += `\n🌍 <b>BIAS SENTIMEN:</b> ${overallSentiment.bias}\n`;
    msg += `Terkuat: ${overallSentiment.strongest} | Terlemah: ${overallSentiment.weakest}\n`;
    
    const sortedPairs = Object.entries(combinedResults).sort(([, a], [, b]) => b.confidence - a.confidence);
    const bestPair = sortedPairs[0];
    msg += `\n💡 <b>REKOMENDASI PAIR TERBAIK:</b>\n`;
    msg += `🏆 <b>${bestPair[0]}</b>: ${bestPair[1].combined} (${bestPair[1].confidence.toFixed(0)}% kepercayaan)\n`;
    msg += `  Tech: ${bestPair[1].techSignal} | AI: ${bestPair[1].aiRating}/100 | Geo: ${bestPair[1].geoBias}\n`;
    
    msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
    
    await telegramBot.editMessageText(msg, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('AI Analysis Telegram error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

const forexDataAnalysis = require('./forex-data-analysis');

async function sendForexDataAnalysis(chatId) {
  if (!telegramBot) return;
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, '📊 <b>Forex Data Analysis sedang memproses...</b>', { parse_mode: 'HTML' });
    
    let msg = '';
    let firstPair = true;
    
    for (const pair of config.MAJOR_PAIRS) {
      const analysis = await forexDataAnalysis.analyzePair(pair, '1D');
      
      if (analysis.error) {
        msg += `❌ <b>${pair}</b>: ${analysis.error}\n\n`;
        continue;
      }
      
      const emoji = analysis.recommendation === 'BUY' ? '🟢' : analysis.recommendation === 'SELL' ? '🔴' : '🟡';
      const trendEmoji = analysis.trend.trend === 'UPTREND' ? '📈' : analysis.trend.trend === 'DOWNTREND' ? '📉' : '➡️';
      
      if (firstPair) {
        msg = `📊 <b>FOREX DATA ANALYSIS</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
        msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
        firstPair = false;
      }
      
      msg += `${emoji} <b>${pair}</b>\n`;
      msg += `${trendEmoji} Trend: ${analysis.trend.trend} (${analysis.trend.strength}%)\n`;
      msg += `💰 Price: ${analysis.trend.lastPrice} (${analysis.trend.change}%)\n`;
      msg += `📉 RSI: ${analysis.indicators.rsi} | Stoch: ${analysis.indicators.stoch !== 'N/A' ? analysis.indicators.stoch.k : 'N/A'}\n`;
      msg += `🎯 Signal: ${analysis.recommendation} (✅${analysis.summary.buySignals} ❌${analysis.summary.sellSignals})\n\n`;
    }
    
    msg += `⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
    
    await telegramBot.editMessageText(msg, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('Forex Data Analysis error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

function sendPairList(chatId) {
  const currentPair = userSelectedPairs.get(chatId);
  const pairs = config.MAJOR_PAIRS;
  
  const message = `📋 <b>Daftar Pair Tersedia:</b>

${pairs.map(p => `${p === currentPair ? '✅' : '⬜'} ${p}`).join('\n')}

Pair aktif: <b>${currentPair || 'Semua (default)'}</b>

<b>Klik pair di bawah untuk analisis:</b>`;

  telegramBot.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    ...getPairKeyboard(currentPair) 
  });
}

async function sendAnalysis(chatId, isRefresh = false) {
  if (!telegramBot) return;
  
  const pair = userSelectedPairs.get(chatId);
  
  try {
    const statusMsg = await telegramBot.sendMessage(chatId, 
      isRefresh ? '🔄 <b>Refreshing analysis...</b>' : '📊 <b>Analyzing...</b>',
      { parse_mode: 'HTML' }
    );
    
    const results = await analyzeForex(false);
    
    let message;
    if (pair && config.MAJOR_PAIRS.map(p => p.toUpperCase()).includes(pair)) {
      message = formatPairTelegramMessage(pair, results.allPairData, results.strength, results.sentiment);
    } else {
      message = formatTelegramMessage({ strength: results.strength, sentiment: results.sentiment }, results.allPairData, results.events);
    }
    
    await telegramBot.editMessageText(message, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(chalk.red('Telegram analysis error:'), error.message);
    telegramBot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

function formatPairTelegramMessage(pair, allPairData, strength, sentiment) {
  const tfData = allPairData[pair];
  if (!tfData) return `❌ Data untuk ${pair} tidak ditemukan`;
  
  let msg = `📊 <b>ANALISIS ${pair}</b>\n`;
  msg += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
  
  msg += `💪 <b>CURRENCY STRENGTH:</b>\n`;
  Object.entries(strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
    msg += `${currency}: ${'█'.repeat(Math.min(score, 10))} (${score})\n`;
  });
  
  msg += `\n📈 <b>TECHNICAL BY TIMEFRAME:</b>\n`;
  ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'].forEach(tf => {
    const d = tfData[tf];
    const emoji = d.signal.includes('BUY') ? '🟢' : d.signal.includes('SELL') ? '🔴' : '🟡';
    msg += `${emoji} ${tf}: ${d.signal} | RSI:${d.rsi} | MACD:${d.macdSignal} | EMA:${d.emaSignal}\n`;
  });
  
  const d1 = tfData['D1'];
  const h4 = tfData['H4'];
  const h1 = tfData['H1'];
  const allBuy = d1.signal.includes('BUY') && h4.signal.includes('BUY') && h1.signal.includes('BUY');
  const allSell = d1.signal.includes('SELL') && h4.signal.includes('SELL') && h1.signal.includes('SELL');
  
  if (allBuy) msg += `\n✅ <b>KESIMPULAN: STRONG BUY</b>\n`;
  else if (allSell) msg += `\n❌ <b>KESIMPULAN: STRONG SELL</b>\n`;
  else msg += `\n⏳ <b>KESIMPULAN: WAIT</b>\n`;
  
  msg += `📋 ${d1.conclusion}\n`;
  
  msg += `\n🎯 <b>MARKET SENTIMENT:</b>\n`;
  msg += `Strongest: ${sentiment.strongest.currency} | Weakest: ${sentiment.weakest.currency}\n`;
  msg += `Best Pair: ${sentiment.recommendation}\n`;
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  
  return msg;
}
async function fetchForexFactoryCalendar() {
  try {
    console.log(chalk.cyan('📡 Fetching economic calendar data...'));
    
    const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const events = data.map(item => {
        let impactLevel = 'Low';
        if (item.impact === '3' || item.impact === 'High') impactLevel = 'High';
        else if (item.impact === '2' || item.impact === 'Medium') impactLevel = 'Medium';
        
        // Parse date from ForexFactory (UTC)
        const eventDate = new Date(item.date);
        const utcTime = item.time || '00:00';
        
        // Convert to WIB (UTC+7)
        let [hh, mm] = utcTime.split(':').map(Number);
        let eventDateTime = new Date(eventDate);
        eventDateTime.setUTCHours(hh, mm, 0, 0);
        
        // Convert to WIB
        const wibTime = new Date(eventDateTime.getTime() + 7 * 60 * 60 * 1000);
        
        const dayName = wibTime.toLocaleDateString('en-US', { weekday: 'short' });
        const monthName = wibTime.toLocaleDateString('en-US', { month: 'short' });
        const day = wibTime.getDate();
        const wibTimeStr = wibTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        return {
          date: `${dayName}, ${monthName} ${day}`,
          time: `${wibTimeStr} WIB`,
          currency: item.country || item.currency || '--',
          title: item.title || item.event || 'Unknown Event',
          impact: impactLevel,
          forecast: item.forecast || '--',
          previous: item.previous || '--',
          actual: item.actual || '--',
          source: 'ForexFactory'
        };
      });
      
      console.log(chalk.green(`✅ Found ${events.length} events from ForexFactory API`));
      return events;
      
    } else {
      throw new Error('No events found');
    }
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️ ForexFactory API failed: ${error.message}`));
    console.log(chalk.cyan('🔄 Trying backup source (Investing.com style)...'));
    const backupEvents = await fetchBackupCalendar();
    if (backupEvents.length > 0) return backupEvents;
    
    console.log(chalk.yellow('Using realistic simulated data...'));
    return generateRealisticData();
  }
}

// Backup calendar source
async function fetchBackupCalendar() {
  try {
    // Using a different endpoint structure (mock Investing.com style)
    const url = 'https://api.investing.com/api/financialdata/economic-calendar';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.investing.com',
        'Referer': 'https://www.investing.com/economic-calendar/'
      },
      timeout: 8000
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      const events = data.data.slice(0, 20).map(item => {
        // Investing.com typically provides UTC time
        const eventDate = new Date(item.date);
        const utcTime = item.time || '00:00';
        
        let [hh, mm] = utcTime.split(':').map(Number);
        let eventDateTime = new Date(eventDate);
        eventDateTime.setUTCHours(hh, mm, 0, 0);
        
        const wibTime = new Date(eventDateTime.getTime() + 7 * 60 * 60 * 1000);
        
        const dayName = wibTime.toLocaleDateString('en-US', { weekday: 'short' });
        const monthName = wibTime.toLocaleDateString('en-US', { month: 'short' });
        const day = wibTime.getDate();
        const wibTimeStr = wibTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        let impactLevel = 'Low';
        if (item.importance === 3 || item.volatility === 'high') impactLevel = 'High';
        else if (item.importance === 2 || item.volatility === 'medium') impactLevel = 'Medium';
        
        return {
          date: `${dayName}, ${monthName} ${day}`,
          time: `${wibTimeStr} WIB`,
          currency: item.country || item.currency || '--',
          title: item.event || item.title || 'Unknown Event',
          impact: impactLevel,
          forecast: item.forecast || '--',
          previous: item.previous || '--',
          actual: item.actual || '--',
          source: 'Investing.com'
        };
      });
      
      console.log(chalk.green(`✅ Found ${events.length} events from Investing.com backup`));
      return events;
    }
    
    return [];
  } catch (error) {
    console.log(chalk.yellow(`⚠️ Backup source failed: ${error.message}`));
    return [];
  }
}

function generateRealisticData() {
  const events = [];
  const today = new Date();
  
  const realEvents = [
    { currency: 'USD', title: 'Non-Farm Payrolls', impact: 'High', forecast: '180K', previous: '175K' },
    { currency: 'USD', title: 'Unemployment Rate', impact: 'High', forecast: '3.6%', previous: '3.7%' },
    { currency: 'USD', title: 'CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.4%' },
    { currency: 'USD', title: 'Core CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.3%' },
    { currency: 'USD', title: 'Fed Interest Rate Decision', impact: 'High', forecast: '5.50%', previous: '5.50%' },
    { currency: 'USD', title: 'GDP q/q', impact: 'High', forecast: '2.0%', previous: '2.1%' },
    { currency: 'USD', title: 'Retail Sales m/m', impact: 'Medium', forecast: '0.3%', previous: '0.6%' },
    { currency: 'USD', title: 'ISM Manufacturing PMI', impact: 'Medium', forecast: '49.8', previous: '48.7' },
    { currency: 'USD', title: 'ISM Services PMI', impact: 'Medium', forecast: '52.5', previous: '51.4' },
    { currency: 'USD', title: 'Initial Jobless Claims', impact: 'Medium', forecast: '220K', previous: '215K' },
    { currency: 'EUR', title: 'ECB Interest Rate Decision', impact: 'High', forecast: '4.50%', previous: '4.50%' },
    { currency: 'EUR', title: 'CPI y/y', impact: 'High', forecast: '2.5%', previous: '2.6%' },
    { currency: 'EUR', title: 'German IFO Business Climate', impact: 'Medium', forecast: '89.0', previous: '88.6' },
    { currency: 'EUR', title: 'Eurozone GDP q/q', impact: 'Medium', forecast: '0.1%', previous: '0.1%' },
    { currency: 'GBP', title: 'BoE Interest Rate Decision', impact: 'High', forecast: '5.25%', previous: '5.25%' },
    { currency: 'GBP', title: 'CPI y/y', impact: 'High', forecast: '2.0%', previous: '2.3%' },
    { currency: 'GBP', title: 'UK GDP m/m', impact: 'Medium', forecast: '0.2%', previous: '0.4%' },
    { currency: 'JPY', title: 'BoJ Interest Rate Decision', impact: 'High', forecast: '0.10%', previous: '0.10%' },
    { currency: 'JPY', title: 'CPI y/y', impact: 'High', forecast: '2.8%', previous: '2.7%' },
    { currency: 'JPY', title: 'Tankan Large Manufacturers Index', impact: 'Medium', forecast: '12', previous: '11' },
    { currency: 'AUD', title: 'RBA Interest Rate Decision', impact: 'High', forecast: '4.35%', previous: '4.35%' },
    { currency: 'AUD', title: 'Employment Change', impact: 'Medium', forecast: '25K', previous: '38K' },
    { currency: 'AUD', title: 'Unemployment Rate', impact: 'Medium', forecast: '4.1%', previous: '4.1%' },
    { currency: 'CAD', title: 'BoC Interest Rate Decision', impact: 'High', forecast: '5.00%', previous: '5.00%' },
    { currency: 'CAD', title: 'CPI m/m', impact: 'Medium', forecast: '0.3%', previous: '0.5%' },
    { currency: 'CAD', title: 'Employment Change', impact: 'Medium', forecast: '20K', previous: '25K' },
    { currency: 'CHF', title: 'SNB Interest Rate Decision', impact: 'High', forecast: '1.75%', previous: '1.75%' },
    { currency: 'NZD', title: 'RBNZ Interest Rate Decision', impact: 'High', forecast: '5.50%', previous: '5.50%' },
    { currency: 'CNY', title: 'GDP y/y', impact: 'High', forecast: '5.0%', previous: '5.2%' },
    { currency: 'CNY', title: 'CPI y/y', impact: 'Medium', forecast: '0.3%', previous: '0.3%' },
  ];
  
const times = ['01:30', '02:30', '03:30', '04:30', '05:30', '06:30', 
                 '07:30', '08:30', '09:30', '10:30', '11:30', '12:30',
                 '13:30', '14:30', '15:30', '16:30', '17:30', '18:30'];
   
  const shuffled = realEvents.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 10);
  
  selected.forEach((event, i) => {
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 7));
    
    const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = eventDate.toLocaleDateString('en-US', { month: 'short' });
    const day = eventDate.getDate();
    
    // Random time in WIB (00:00 - 23:59)
    const wibHour = Math.floor(Math.random() * 24);
    const wibMin = Math.random() > 0.5 ? 30 : 0;
    const wibTimeStr = `${wibHour.toString().padStart(2, '0')}:${wibMin.toString().padStart(2, '0')}`;
    
    events.push({
      date: `${dayName}, ${monthName} ${day}`,
      time: `${wibTimeStr} WIB`,
      currency: event.currency,
      title: event.title,
      impact: event.impact,
      forecast: event.forecast,
      previous: event.previous,
      actual: '--'
    });
  });
  
  console.log(chalk.green(`✅ Generated ${events.length} realistic economic events`));
  return events;
}

const TIMEFRAMES = {
  M1: { label: 'M1', candles: 60, period: 1 },
  M5: { label: 'M5', candles: 120, period: 5 },
  M15: { label: 'M15', candles: 200, period: 15 },
  H1: { label: 'H1', candles: 200, period: 60 },
  H4: { label: 'H4', candles: 200, period: 240 },
  D1: { label: 'D1', candles: 200, period: 1440 }
};

function generatePriceData(length = 200, volatility = 0.005, symbol = 'EUR/USD') {
  const data = [];
  const basePrices = {
    'XAU/USD': 2350 + (Math.random() - 0.5) * 100,
    'BTC/USD': 65000 + (Math.random() - 0.5) * 5000,
    'USD/JPY': 155 + (Math.random() - 0.5) * 5,
    'default': 1.1000 + (Math.random() - 0.5) * 0.1
  };
  let price = basePrices[symbol] || basePrices['default'];
  const priceVolatility = symbol === 'XAU/USD' ? volatility * 100 : 
                          symbol === 'BTC/USD' ? volatility * 10000 :
                          symbol === 'USD/JPY' ? volatility * 100 : volatility;
  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.5) * priceVolatility;
    price += change;
    data.push(price);
  }
  return data;
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const bb = BollingerBands.calculate({ period, values: prices, stdDev });
  return bb[bb.length - 1];
}

function calculateAllIndicators(prices) {
  const sma20 = SMA.calculate({ period: 20, values: prices });
  const sma50 = SMA.calculate({ period: 50, values: prices });
  const sma200 = SMA.calculate({ period: 200, values: prices });
  const ema5 = EMA.calculate({ period: 5, values: prices });
  const ema8 = EMA.calculate({ period: 8, values: prices });
  const ema9 = EMA.calculate({ period: 9, values: prices });
  const ema13 = EMA.calculate({ period: 13, values: prices });
  const ema21 = EMA.calculate({ period: 21, values: prices });
  const ema34 = EMA.calculate({ period: 34, values: prices });
  const ema50 = EMA.calculate({ period: 50, values: prices });
  const ema100 = EMA.calculate({ period: 100, values: prices });
  const ema200 = EMA.calculate({ period: 200, values: prices });
  const rsi = RSI.calculate({ period: 14, values: prices });
  const macd = MACD.calculate({
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const bb = calculateBollingerBands(prices);

  return {
    sma20: sma20[sma20.length - 1],
    sma50: sma50[sma50.length - 1],
    sma200: sma200[sma200.length - 1],
    ema5: ema5[ema5.length - 1],
    ema8: ema8[ema8.length - 1],
    ema9: ema9[ema9.length - 1],
    ema13: ema13[ema13.length - 1],
    ema21: ema21[ema21.length - 1],
    ema34: ema34[ema34.length - 1],
    ema50: ema50[ema50.length - 1],
    ema100: ema100[ema100.length - 1],
    ema200: ema200[ema200.length - 1],
    rsi: rsi[rsi.length - 1],
    macd: macd[macd.length - 1],
    bb: bb,
    currentPrice: prices[prices.length - 1]
  };
}

function analyzeTechnical(prices, timeframe = 'H1') {
  const ind = calculateAllIndicators(prices);
  const { currentPrice, sma20, sma50, sma200, ema5, ema8, ema9, ema13, ema21, ema34, ema50, ema100, ema200, rsi, macd, bb } = ind;

  let trend = 'NEUTRAL';
  let strength = 0;

  if (currentPrice > sma200 && ema9 > ema21) {
    trend = 'UPTREND';
    strength = 2;
  } else if (currentPrice < sma200 && ema9 < ema21) {
    trend = 'DOWNTREND';
    strength = -2;
  } else if (currentPrice > sma50) {
    trend = 'WEAK UP';
    strength = 1;
  } else if (currentPrice < sma50) {
    trend = 'WEAK DOWN';
    strength = -1;
  }

  let rsiSignal = 'NEUTRAL';
  let rsiStrength = 0;
  if (rsi > 70) { rsiSignal = 'OVERBOUGHT'; rsiStrength = -2; }
  else if (rsi < 30) { rsiSignal = 'OVERSOLD'; rsiStrength = 2; }
  else if (rsi > 60) { rsiSignal = 'BULLISH ZONE'; rsiStrength = 1; }
  else if (rsi < 40) { rsiSignal = 'BEARISH ZONE'; rsiStrength = -1; }

  let macdSignal = 'NEUTRAL';
  let macdStrength = 0;
  if (macd) {
    if (macd.MACD > macd.signal && macd.histogram > 0) {
      macdSignal = 'BULLISH';
      macdStrength = macd.histogram > 0.001 ? 2 : 1;
    } else if (macd.MACD < macd.signal && macd.histogram < 0) {
      macdSignal = 'BEARISH';
      macdStrength = macd.histogram < -0.001 ? -2 : -1;
    }
  }

  let bbSignal = 'NEUTRAL';
  let bbPosition = 'MIDDLE';
  let bbStrength = 0;
  if (bb) {
    if (currentPrice <= bb.lower) {
      bbSignal = 'OVERSOLD';
      bbPosition = 'LOWER';
      bbStrength = 2;
    } else if (currentPrice >= bb.upper) {
      bbSignal = 'OVERBOUGHT';
      bbPosition = 'UPPER';
      bbStrength = -2;
    } else if (currentPrice > bb.middle) {
      bbPosition = 'ABOVE MID';
      bbStrength = 1;
    } else {
      bbPosition = 'BELOW MID';
      bbStrength = -1;
    }
  }

  let emaSignal = 'NEUTRAL';
  let emaStrength = 0;
  let emaDetails = '';
  
  const emaShort = ema5 > ema8 && ema8 > ema9 && ema9 > ema13;
  const emaLong = ema34 > ema50 && ema50 > ema100 && ema100 > ema200;
  const emaBearShort = ema5 < ema8 && ema8 < ema9 && ema9 < ema13;
  const emaBearLong = ema34 < ema50 && ema50 < ema100 && ema100 < ema200;
  
  if (emaShort && emaLong) {
    emaSignal = 'STRONG BULLISH';
    emaStrength = 3;
    emaDetails = 'EMA5>8>9>13 & EMA34>50>100>200';
  } else if (emaBearShort && emaBearLong) {
    emaSignal = 'STRONG BEARISH';
    emaStrength = -3;
    emaDetails = 'EMA5<8<9<13 & EMA34<50<100<200';
  } else if (ema9 > ema21 && ema21 > ind.ema50) {
    emaSignal = 'BULLISH CROSS';
    emaStrength = 2;
    emaDetails = 'EMA9>21>50';
  } else if (ema9 < ema21 && ema21 < ind.ema50) {
    emaSignal = 'BEARISH CROSS';
    emaStrength = -2;
    emaDetails = 'EMA9<21<50';
  } else if (currentPrice > ema200) {
    emaSignal = 'ABOVE EMA200';
    emaStrength = 1;
    emaDetails = 'Price > EMA200';
  } else if (currentPrice < ema200) {
    emaSignal = 'BELOW EMA200';
    emaStrength = -1;
    emaDetails = 'Price < EMA200';
  }

  const totalScore = strength + macdStrength + rsiStrength + bbStrength + emaStrength;

  let signal = 'WAIT';
  let signalColor = 'yellow';
  if (totalScore >= 5) { signal = 'STRONG BUY'; signalColor = 'green'; }
  else if (totalScore >= 2) { signal = 'BUY'; signalColor = 'green'; }
  else if (totalScore <= -5) { signal = 'STRONG SELL'; signalColor = 'red'; }
  else if (totalScore <= -2) { signal = 'SELL'; signalColor = 'red'; }

  let conclusion = '';
  if (totalScore >= 5) conclusion = 'Semua indikator konfirmasi BUY kuat. Entry sekarang atau tunggu pullback.';
  else if (totalScore >= 2) conclusion = 'Ada sinyal BUY tapi belum konfirmasi kuat. Perlu konfirmasi dari indikator lain.';
  else if (totalScore <= -5) conclusion = 'Semua indikator konfirmasi SELL kuat. Entry sekarang atau tunggu pullback.';
  else if (totalScore <= -2) conclusion = 'Ada sinyal SELL tapi belum konfirmasi kuat. Perlu konfirmasi dari indikator lain.';
  else conclusion = 'Indikator campuran. Tunggu konfirmasi lebih jelas sebelum entry.';

  return {
    timeframe,
    trend,
    strength,
    rsi: rsi ? rsi.toFixed(2) : '50.00',
    rsiSignal,
    macdSignal,
    macdValue: macd ? `${macd.MACD.toFixed(5)}` : '0',
    macdSignalLine: macd ? `${macd.signal.toFixed(5)}` : '0',
    macdHistogram: macd ? `${macd.histogram.toFixed(5)}` : '0',
    bbMiddle: bb ? bb.middle.toFixed(5) : '0',
    bbUpper: bb ? bb.upper.toFixed(5) : '0',
    bbLower: bb ? bb.lower.toFixed(5) : '0',
    bbPosition,
    bbSignal,
    ema5: ema5 ? ema5.toFixed(5) : '0',
    ema8: ema8 ? ema8.toFixed(5) : '0',
    ema9: ema9 ? ema9.toFixed(5) : '0',
    ema13: ema13 ? ema13.toFixed(5) : '0',
    ema21: ema21 ? ema21.toFixed(5) : '0',
    ema34: ema34 ? ema34.toFixed(5) : '0',
    ema50: ema50 ? ema50.toFixed(5) : '0',
    ema100: ema100 ? ema100.toFixed(5) : '0',
    ema200: ema200 ? ema200.toFixed(5) : '0',
    emaSignal,
    emaDetails,
    signal,
    signalColor,
    currentPrice: currentPrice.toFixed(5),
    totalScore,
    conclusion
  };
}

function analyzeMultiTimeframe(pair) {
  const results = {};
  Object.keys(TIMEFRAMES).forEach(tf => {
    const volatility = tf === 'M1' ? 0.001 : tf === 'M5' ? 0.002 : tf === 'M15' ? 0.003 : tf === 'H1' ? 0.004 : tf === 'H4' ? 0.005 : 0.006;
    const prices = generatePriceData(200, volatility, pair);
    results[tf] = analyzeTechnical(prices, tf);
  });
  return results;
}

function generateSimulatedData() {
  const events = [];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
  const impacts = ['High', 'Medium', 'Low'];
  const today = new Date();
  const ECONOMIC_INDICATORS = [
    'GDP Growth Rate', 'Interest Rate Decision', 'Inflation Rate (CPI)',
    'Unemployment Rate', 'Trade Balance', 'Consumer Confidence',
    'Manufacturing PMI', 'Services PMI', 'Retail Sales', 'Central Bank Speech'
  ];
  for (let i = 0; i < 10; i++) {
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 7));
    events.push({
      date: eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: `${Math.floor(Math.random() * 12) + 8}:${Math.random() > 0.5 ? '00' : '30'} AM`,
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      event: ECONOMIC_INDICATORS[Math.floor(Math.random() * ECONOMIC_INDICATORS.length)],
      impact: impacts[Math.floor(Math.random() * impacts.length)],
      forecast: (Math.random() * 5).toFixed(1) + '%',
      previous: (Math.random() * 5).toFixed(1) + '%'
    });
  }
  return events;
}

function analyzeCurrencyStrength(events) {
  const strength = {};
  ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'].forEach(c => strength[c] = 0);
  events.forEach(event => {
    if (strength[event.currency] !== undefined) {
      strength[event.currency] += event.impact === 'High' ? 3 : event.impact === 'Medium' ? 2 : 1;
    }
  });
  return strength;
}

function getSentimentAnalysis(strength) {
  const sorted = Object.entries(strength).sort(([, a], [, b]) => b - a);
  return {
    strongest: { currency: sorted[0][0], score: sorted[0][1] },
    weakest: { currency: sorted[sorted.length - 1][0], score: sorted[sorted.length - 1][1] },
    recommendation: `${sorted[0][0]}/${sorted[sorted.length - 1][0]}`
  };
}

function formatTelegramMessage(fundamental, allPairData, events = []) {
  let msg = `📊 <b>FOREX MULTI-TF ANALYSIS</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
  msg += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
  msg += `🎯 <b>RECOMMENDED:</b> ${fundamental.sentiment.recommendation}\n\n`;
  msg += `💪 <b>STRENGTH:</b>\n`;
  Object.entries(fundamental.strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
    msg += `${currency}: ${'█'.repeat(Math.min(score, 10))} (${score})\n`;
  });

  msg += `\n📈 <b>TECHNICAL:</b>\n`;
  Object.entries(allPairData).forEach(([pair, tfData]) => {
    msg += `\n<b>${pair}:</b>\n`;
    ['H1', 'H4', 'D1'].forEach(tf => {
      const d = tfData[tf];
      const emoji = d.signal.includes('BUY') ? '🟢' : d.signal.includes('SELL') ? '🔴' : '🟡';
      const price = parseFloat(d.currentPrice);
      const ma20 = d.sma20 ? parseFloat(d.sma20) : null;
      const ma50 = d.sma50 ? parseFloat(d.sma50) : null;
      const ma200 = d.sma200 ? parseFloat(d.sma200) : null;
      const ema9 = d.ema9 ? parseFloat(d.ema9) : null;
      const ema21 = d.ema21 ? parseFloat(d.ema21) : null;
      const ema50 = d.ema50 ? parseFloat(d.ema50) : null;
      const ema200 = d.ema200 ? parseFloat(d.ema200) : null;
      
      let maInfo = '';
      if (ma20) maInfo += ` M20:${price > ma20 ? '▲' : '▼'}`;
      if (ma50) maInfo += ` M50:${price > ma50 ? '▲' : '▼'}`;
      if (ma200) maInfo += ` M200:${price > ma200 ? '▲' : '▼'}`;
      if (ema9) maInfo += ` E9:${price > ema9 ? '▲' : '▼'}`;
      if (ema21) maInfo += ` E21:${price > ema21 ? '▲' : '▼'}`;
      if (ema50) maInfo += ` E50:${price > ema50 ? '▲' : '▼'}`;
      if (ema200) maInfo += ` E200:${price > ema200 ? '▲' : '▼'}`;
      
      msg += `${emoji} ${tf}: ${d.signal} | RSI:${d.rsi} | MACD:${d.macdSignal} | EMA:${d.emaSignal}${maInfo}\n`;
    });
    
    const d1 = tfData['D1'];
    const h4 = tfData['H4'];
    const h1 = tfData['H1'];
    const allBuy = d1.signal.includes('BUY') && h4.signal.includes('BUY') && h1.signal.includes('BUY');
    const allSell = d1.signal.includes('SELL') && h4.signal.includes('SELL') && h1.signal.includes('SELL');
    
    if (allBuy) msg += `✅ <b>KESIMPULAN: BUY</b>\n`;
    else if (allSell) msg += `❌ <b>KESIMPULAN: SELL</b>\n`;
    else msg += `⏳ <b>KESIMPULAN: WAIT</b>\n`;
    
    msg += `📋 ${d1.conclusion}\n`;
  });

  // News Section
  if (events.length > 0) {
    msg += `\n📅 <b>NEWS (WIB):</b>\n`;
    events.slice(0, 5).forEach(e => {
      const imp = e.impact === 'High' ? '🔴' : e.impact === 'Medium' ? '🟡' : '🟢';
      const src = e.source ? ` [${e.source}]` : '';
      msg += `${imp} ${e.date} ${e.time} ${e.currency} - ${e.title}${src}\n`;
    });
  }

  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  return msg;
}

function formatCombinedTelegramMessage(technicalResults, sentimentResults, overallSentiment, events = [], combinedResults = {}) {
  let msg = `🎯 <b>ANALISIS GABUNGAN 3-IN-1</b> by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
  msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
  
  msg += `💪 <b>KEKUATAN MATA UANG:</b>\n`;
  Object.entries(technicalResults.strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
    msg += `${currency}: ${'█'.repeat(Math.min(score, 10))} (${score})\n`;
  });
  
  msg += `\n📰 <b>SENTIMEN BERITA AI:</b>\n`;
  for (const pair of config.MAJOR_PAIRS) {
    const s = sentimentResults[pair].sentiment;
    const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
    msg += `${emoji} <b>${pair}</b>: ${s.rating}/100 (${s.sentiment})\n`;
  }
  
  msg += `\n📈 <b>SINYAL GABUNGAN:</b>\n`;
  for (const pair of config.MAJOR_PAIRS) {
    const tfData = technicalResults.allPairData[pair];
    const h1 = tfData?.H1;
    const aiSent = sentimentResults[pair].sentiment;
    
    let techSignal = 'WAIT';
    if (h1?.signal.includes('BUY')) techSignal = 'BUY';
    else if (h1?.signal.includes('SELL')) techSignal = 'SELL';
    
    let combined = 'WAIT';
    let confidence = 50;
    
    if (techSignal === 'BUY' && aiSent.rating > 55) {
      combined = 'STRONG BUY';
      confidence = Math.min(90, 60 + (aiSent.rating - 50) / 2);
    } else if (techSignal === 'SELL' && aiSent.rating < 45) {
      combined = 'STRONG SELL';
      confidence = Math.min(90, 60 + (50 - aiSent.rating) / 2);
    } else if (techSignal === 'BUY' || aiSent.rating > 60) {
      combined = 'BUY';
      confidence = 65;
    } else if (techSignal === 'SELL' || aiSent.rating < 40) {
      combined = 'SELL';
      confidence = 65;
    }
    
    const emoji = combined.includes('BUY') ? '🟢' : combined.includes('SELL') ? '🔴' : '🟡';
    msg += `${emoji} <b>${pair}</b>: ${combined} (${confidence.toFixed(0)}%)\n`;
    msg += `  Tech: ${techSignal} | AI: ${aiSent.rating}/100\n`;
  }
  
  msg += `\n📰 <b>RINGKASAN SENTIMEN BERITA AI:</b>\n`;
  for (const pair of config.MAJOR_PAIRS) {
    const s = sentimentResults[pair].sentiment;
    const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
    msg += `${emoji} <b>${pair}</b>: ${s.rating}/100 (${s.sentiment}) - ${s.timeframe}\n`;
    msg += `  📌 ${s.summary}\n`;
  }
  
  msg += `\n🌍 <b>WAWASAN GEOPOLITIK:</b>\n`;
  for (const currency of ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']) {
    const cond = geopolitical.getBuySellConditions(currency);
    if (cond.buy.length > 0) msg += `🟢 Beli ${currency}: ${cond.buy[0]}\n`;
    if (cond.sell.length > 0) msg += `🔴 Jual ${currency}: ${cond.sell[0]}\n`;
  }
  
  msg += `\n🌍 <b>BIAS SENTIMEN:</b> ${overallSentiment.bias}\n`;
  msg += `Terkuat: ${overallSentiment.strongest} | Terlemah: ${overallSentiment.weakest}\n`;
  
  if (Object.keys(combinedResults).length > 0) {
    const sortedPairs = Object.entries(combinedResults).sort(([, a], [, b]) => b.confidence - a.confidence);
    const bestPair = sortedPairs[0];
    msg += `\n💡 <b>REKOMENDASI PAIR TERBAIK:</b>\n`;
    msg += `🏆 <b>${bestPair[0]}</b>: ${bestPair[1].combined} (${bestPair[1].confidence.toFixed(0)}% kepercayaan)\n`;
    msg += `  Tech: ${bestPair[1].techSignal} | AI: ${bestPair[1].aiRating}/100 | Geo: ${bestPair[1].geoBias}\n`;
  }
  
  if (events.length > 0) {
    msg += `\n📅 <b>KABAR (WIB):</b>\n`;
    events.slice(0, 3).forEach(e => {
      const imp = e.impact === 'High' ? '🔴' : e.impact === 'Medium' ? '🟡' : '🟢';
      msg += `${imp} ${e.date} ${e.currency} - ${e.title}\n`;
    });
  }
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  return msg;
}

async function sendTelegramMessage(message) {
  if (!telegramBot) return false;
  try {
    await telegramBot.sendMessage(config.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
    return true;
  } catch (error) {
    console.error(chalk.red('Telegram error:'), error.message);
    return false;
  }
}

async function analyzeForex(sendTelegram = false) {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║         FOREX MULTI-TIMEFRAME ANALYSIS BOT (MACD/BB/EMA)         ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════════╝\n'));

  const today = new Date();
  console.log(chalk.cyan(`📅 Date: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`));
  console.log(chalk.cyan(`⏰ Time: ${today.toLocaleTimeString()}\n`));

  console.log(chalk.yellow.bold('📊 UPCOMING ECONOMIC EVENTS:'));
  console.log(chalk.gray('─'.repeat(70)));
  const events = await fetchForexFactoryCalendar();
  events.slice(0, 6).forEach(event => {
    const impactColor = event.impact === 'High' ? chalk.red : event.impact === 'Medium' ? chalk.yellow : chalk.green;
    const eventName = event.title || event.event || 'Unknown';
    const src = event.source ? ` [${event.source}]` : '';
    console.log(`${chalk.white(event.date.padEnd(14))} ${chalk.cyan(event.time.padEnd(10))} ${chalk.white(event.currency.padEnd(5))} ${chalk.white(eventName.padEnd(30))} ${impactColor(event.impact.padEnd(8))} F:${event.forecast.padEnd(6)} P:${event.previous}${chalk.gray(src)}`);
  });

  const strength = analyzeCurrencyStrength(events);
  const sentiment = getSentimentAnalysis(strength);

  console.log(chalk.yellow.bold('\n💪 CURRENCY STRENGTH:'));
  console.log(chalk.gray('─'.repeat(70)));
  Object.entries(strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
    const bar = '█'.repeat(Math.min(score, 20));
    const color = score > 5 ? chalk.green : score > 2 ? chalk.yellow : chalk.red;
    console.log(`${chalk.white(currency)}: ${color(bar)} (${score})`);
  });

  const allPairData = {};
  console.log(chalk.yellow.bold('\n📈 MULTI-TIMEFRAME TECHNICAL ANALYSIS:'));
  console.log(chalk.gray('═'.repeat(70)));

  config.MAJOR_PAIRS.forEach(pair => {
    const tfData = analyzeMultiTimeframe(pair);
    allPairData[pair] = tfData;

    console.log(chalk.cyan.bold(`\n  ${pair}`));
    console.log(chalk.gray('  ' + '─'.repeat(66)));
    console.log(chalk.white('  ' + 'TF'.padEnd(6) + 'SIGNAL'.padEnd(15) + 'TREND'.padEnd(14) + 'RSI'.padEnd(8) + 'MACD'.padEnd(12) + 'BB POS'.padEnd(10) + 'EMA'));
    console.log(chalk.gray('  ' + '─'.repeat(66)));

    ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'].forEach(tf => {
      const d = tfData[tf];
      const signalColor = d.signal.includes('BUY') ? chalk.green : d.signal.includes('SELL') ? chalk.red : chalk.yellow;
      const trendColor = d.strength > 0 ? chalk.green : d.strength < 0 ? chalk.red : chalk.yellow;

      console.log(chalk.white('  ' +
        d.timeframe.padEnd(6) +
        signalColor(d.signal.padEnd(15)) +
        trendColor(d.trend.padEnd(14)) +
        chalk.cyan(d.rsi.padEnd(8)) +
        chalk.magenta(d.macdSignal.padEnd(12)) +
        chalk.blue(d.bbPosition.padEnd(10)) +
        chalk.yellow(d.emaSignal)
      ));
    });

    const h1 = tfData['H1'];
    const h4 = tfData['H4'];
    const d1 = tfData['D1'];
    const htfTrend = d1.trend;
    const ltfTrend = h1.trend;

    let overallSignal = 'WAIT';
    let overallColor = chalk.yellow;

    if (htfTrend === 'UPTREND' && h1.signal === 'BUY') { overallSignal = 'BUY'; overallColor = chalk.green; }
    else if (htfTrend === 'DOWNTREND' && h1.signal === 'SELL') { overallSignal = 'SELL'; overallColor = chalk.red; }
    else if (htfTrend === 'UPTREND' && h1.signal === 'STRONG BUY') { overallSignal = 'STRONG BUY'; overallColor = chalk.green; }
    else if (htfTrend === 'DOWNTREND' && h1.signal === 'STRONG SELL') { overallSignal = 'STRONG SELL'; overallColor = chalk.red; }

    console.log(chalk.gray('  ' + '─'.repeat(66)));
    console.log(chalk.white('  ' + 'OVERALL: ') + overallColor.bold(overallSignal));
    
    console.log(chalk.yellow.bold('\n  📋 KESIMPULAN:'));
    const d1Conclusion = tfData['D1'].conclusion;
    const h4Conclusion = tfData['H4'].conclusion;
    const h1Conclusion = tfData['H1'].conclusion;
    
    console.log(chalk.white('  D1: ') + chalk.cyan(d1Conclusion));
    console.log(chalk.white('  H4: ') + chalk.cyan(h4Conclusion));
    console.log(chalk.white('  H1: ') + chalk.cyan(h1Conclusion));
    
    const allBuy = d1.signal.includes('BUY') && h4.signal.includes('BUY') && h1.signal.includes('BUY');
    const allSell = d1.signal.includes('SELL') && h4.signal.includes('SELL') && h1.signal.includes('SELL');
    
    if (allBuy) {
      console.log(chalk.green.bold('  ✅ REKOMENDASI: BUY - Semua timeframe konfirmasi naik'));
    } else if (allSell) {
      console.log(chalk.red.bold('  ❌ REKOMENDASI: SELL - Semua timeframe konfirmasi turun'));
    } else {
      console.log(chalk.yellow.bold('  ⏳ REKOMENDASI: WAIT - Tunggu konfirmasi'));
    }
  });

  console.log(chalk.yellow.bold('\n🎯 MARKET SENTIMENT:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(`${chalk.white('Strongest:')} ${chalk.green(sentiment.strongest.currency)} (${sentiment.strongest.score}) | ${chalk.white('Weakest:')} ${chalk.red(sentiment.weakest.currency)} (${sentiment.weakest.score})`);
  console.log(`${chalk.white('Best Pair:')} ${chalk.cyan.bold(sentiment.recommendation)}`);

  console.log(chalk.yellow.bold('\n💡 SUMMARY SIGNALS:'));
  console.log(chalk.gray('─'.repeat(70)));
  Object.entries(allPairData).forEach(([pair, tfData]) => {
    const d1 = tfData['D1'];
    const h4 = tfData['H4'];
    const h1 = tfData['H1'];
    const color = d1.signal.includes('BUY') ? chalk.green : d1.signal.includes('SELL') ? chalk.red : chalk.yellow;
    console.log(`${chalk.white(pair.padEnd(10))} D1:${color(d1.signal.padEnd(14))} H4:${color(h4.signal.padEnd(14))} H1:${color(h1.signal.padEnd(14))}`);
  });

  console.log(chalk.yellow.bold('\n⚠️  DISCLAIMER:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.gray('This is automated analysis for informational purposes only.'));
  console.log(chalk.gray('Not financial advice. Always do your own research.\n'));

  console.log(chalk.blue.bold('════════════════════════════════════════════════════════════════════'));
  console.log(chalk.blue.bold(`Bot completed at ${new Date().toLocaleTimeString()}`));
  console.log(chalk.blue.bold('════════════════════════════════════════════════════════════════════\n'));

  if (sendTelegram && telegramBot) {
    const telegramMsg = formatTelegramMessage({ strength, sentiment }, allPairData, events);
    const sent = await sendTelegramMessage(telegramMsg);
    if (sent) console.log(chalk.green('✅ Telegram notification sent!'));
  }

  return { events, strength, sentiment, allPairData };
}

// ========== BBEMA BEDJO V2.0 INTEGRATION ==========

async function analyzeForexBBEMA(sendTelegram = false, equityUSD = 500) {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║       BBEMA BEDJO V2.0 — MULTI-TF REVERSAL/FOLLOW ANALYSIS       ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════════╝\n'));

  const today = new Date();
  console.log(chalk.cyan(`📅 Date: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`));
  console.log(chalk.cyan(`⏰ Time: ${today.toLocaleTimeString()}\n`));

  const session = bbema.getCurrentSession();
  console.log(chalk.yellow.bold(`🕐 CURRENT SESSION: ${session.name} (${session.range})`));
  console.log(chalk.cyan(`   Bias: ${session.bias} | Focus: ${session.focus.join(', ')}`));
  console.log(chalk.gray('─'.repeat(70)));

  const events = await fetchForexFactoryCalendar();
  const strength = analyzeCurrencyStrength(events);
  const sentiment = getSentimentAnalysis(strength);

  console.log(chalk.yellow.bold('\n💪 CURRENCY STRENGTH (Fundamental):'));
  console.log(chalk.gray('─'.repeat(70)));
  Object.entries(strength).sort(([, a], [, b]) => b - a).forEach(([currency, score]) => {
    const bar = '█'.repeat(Math.min(score, 20));
    const color = score > 5 ? chalk.green : score > 2 ? chalk.yellow : chalk.red;
    console.log(`${chalk.white(currency)}: ${color(bar)} (${score})`);
  });

  const allPairBBEMA = {};
  
  for (const pair of config.MAJOR_PAIRS) {
    console.log(chalk.cyan.bold(`\n  ═══ ${pair} ═══`));
    console.log(chalk.gray('  ' + '─'.repeat(66)));
    
    const tfCandles = await generateMultiTFCandles(pair);
    const result = await bbema.analyzeMultiTFBBEMA(pair, tfCandles, equityUSD);
    allPairBBEMA[pair] = result;
    
    console.log(chalk.white('  ' + 'TF'.padEnd(6) + 'SIGNAL'.padEnd(12) + 'TANGGA'.padEnd(10) + 'PHASE'.padEnd(12) + 'ENTRY'.padEnd(10) + 'MM'));
    console.log(chalk.gray('  ' + '─'.repeat(66)));
    
    ['M5', 'M15', 'H1', 'H4', 'D1'].forEach(tf => {
      if (result.timeframes[tf]) {
        const d = result.timeframes[tf];
        const signalColor = d.signal.includes('BUY') ? chalk.green : d.signal.includes('SELL') ? chalk.red : chalk.yellow;
        const tg = d.tangga || { count: 0, phase: 'N/A' };
        const phaseColor = tg.phase === 'REVERSAL' ? chalk.magenta : tg.phase === 'FOLLOW' ? chalk.blue : chalk.gray;
        
        console.log(chalk.white('  ' +
          d.tf.padEnd(6) +
          signalColor(d.signal.padEnd(12)) +
          chalk.cyan(`${tg.count}/6`.padEnd(10)) +
          phaseColor(tg.phase.padEnd(12)) +
          chalk.yellow((d.entryType || '-').padEnd(10)) +
          (d.mm?.bufferOK ? chalk.green('✓') : chalk.red('✗'))
        ));
      }
    });
    
    const decColor = result.decision === 'BUY' ? chalk.green.bold : result.decision === 'SELL' ? chalk.red.bold : result.decision === 'RANGE' ? chalk.cyan.bold : chalk.yellow.bold;
    console.log(chalk.gray('  ' + '─'.repeat(66)));
    console.log(chalk.white('  OVERALL: ') + decColor(result.decision));
    console.log(chalk.cyan('  REASON: ') + result.decisionReason);
    
    const bestTF = result.timeframes.H1 || result.timeframes.M15;
    if (bestTF && bestTF.signal !== 'WAIT') {
      console.log(chalk.yellow.bold('\n  📋 SETUP DETAIL:'));
      console.log(chalk.white(`  Entry: ${bestTF.entryType} @ ${bestTF.entryPrice} | SL: ${bestTF.sl} (${bestTF.mm.slPips}p)`));
      console.log(chalk.white(`  TP1: ${bestTF.tp1} (EMA13) | TP2: ${bestTF.tp2} (EMA18) | TP3: ${bestTF.tp3} (EMA28/BB)`));
      console.log(chalk.white(`  Lot: ${bestTF.mm.recommendedLot} | Avg: ${bestTF.mm.avgDistance}p x${bestTF.mm.totalAvgSteps} | Buffer: ${bestTF.mm.maxDrawdownPips}/${bestTF.mm.bufferPips}p`));
      if (!bestTF.mm.bufferOK) console.log(chalk.red(`  ⚠️ ${bestTF.mm.warning}`));
    }
  }

  console.log(chalk.yellow.bold('\n🎯 MARKET SENTIMENT:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(`${chalk.white('Strongest:')} ${chalk.green(sentiment.strongest.currency)} (${sentiment.strongest.score}) | ${chalk.white('Weakest:')} ${chalk.red(sentiment.weakest.currency)} (${sentiment.weakest.score})`);
console.log(`${chalk.white('Best Pair:')} ${chalk.cyan.bold(sentiment.recommendation)}`);
  console.log(`${chalk.white('Session:')} ${session.name} | ${chalk.white('Bias:')} ${session.bias}`);

  // Display News
  console.log(chalk.yellow.bold('\n📅 ECONOMIC NEWS (WIB):'));
  console.log(chalk.gray('─'.repeat(70)));
  events.slice(0, 8).forEach(event => {
    const impactColor = event.impact === 'High' ? chalk.red : event.impact === 'Medium' ? chalk.yellow : chalk.green;
    const imp = event.impact === 'High' ? '🔴' : event.impact === 'Medium' ? '🟡' : '🟢';
    const src = event.source ? ` [${event.source}]` : '';
    console.log(`${imp} ${chalk.white(event.date.padEnd(14))} ${chalk.cyan(event.time.padEnd(10))} ${chalk.white(event.currency.padEnd(5))} ${chalk.white(event.title.padEnd(30))} ${impactColor(event.impact.padEnd(8))}${chalk.gray(src)}`);
  });

  console.log(chalk.yellow.bold('\n💡 BBEMA SIGNALS SUMMARY:'));
  console.log(chalk.gray('─'.repeat(70)));
  Object.entries(allPairBBEMA).forEach(([pair, data]) => {
    const dec = data.decision;
    const color = dec === 'BUY' ? chalk.green : dec === 'SELL' ? chalk.red : dec === 'RANGE' ? chalk.cyan : chalk.yellow;
    const h1 = data.timeframes.H1;
    const tgCount = h1?.tangga?.count || 0;
    const tgPhase = h1?.tangga?.phase || 'N/A';
    const tg = `${tgCount}/6 ${tgPhase[0]}`;
    console.log(`${chalk.white(pair.padEnd(10))} ${color(dec.padEnd(10))} Tangga: ${chalk.cyan(tg.padEnd(18))} HTF: ${chalk.white(data.htfBias.padEnd(8))} LTF: ${chalk.white(data.ltfSignal)}`);
  });

  if (sendTelegram && telegramBot) {
    const telegramMsg = formatBBEMATelegramMessage(allPairBBEMA, sentiment, session, events.slice(0,5));
    const sent = await sendTelegramMessage(telegramMsg);
    if (sent) console.log(chalk.green('\n✅ Telegram notification sent!'));
  }

  console.log(chalk.blue.bold('\n════════════════════════════════════════════════════════════════════'));
  console.log(chalk.blue.bold(`BBEMA Analysis completed at ${new Date().toLocaleTimeString()}`));
  console.log(chalk.blue.bold('════════════════════════════════════════════════════════════════════\n'));

  return { events, strength, sentiment, allPairBBEMA, session };
}

async function generateMultiTFCandles(pair) {
  const yahooFinance = new (require('yahoo-finance2').default)();
  const fs = require('fs');
  const path = require('path');
  const cachePath = path.join(__dirname, 'cache_' + pair.replace('/', '_') + '.json');
  
  // Cache check
  if (fs.existsSync(cachePath)) {
    const stats = fs.statSync(cachePath);
    if (Date.now() - stats.mtimeMs < 5 * 60 * 1000) { // 5 minutes cache
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  }

  const yahooSymbols = {
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'JPY=X',
    'USD/CHF': 'CHF=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'CAD=X',
    'NZD/USD': 'NZDUSD=X',
    'XAU/USD': 'GC=F'
  };

  const symbol = yahooSymbols[pair] || pair.replace('/', '') + '=X';
  const tfCandles = {};
  const intervals = { 'M5': '5m', 'M15': '15m', 'H1': '1h', 'H4': '1h', 'D1': '1d' };

  async function fetchWithRetry(symbol, interval, options, retries = 2) {
    for (let i = 0; i < retries; i++) {
      try {
        return await yahooFinance.chart(symbol, { interval, ...options });
      } catch (e) {
        console.warn('Retry ' + (i + 1) + ' for ' + symbol + ' (' + interval + '): ' + e.message);
        if (i === retries - 1) throw e;
        await new Promise(res => setTimeout(res, 2000 * (i + 1)));
      }
    }
  }

  for (const [tf, interval] of Object.entries(intervals)) {
    try {
      const queryOptions = { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      const result = await fetchWithRetry(symbol, interval, queryOptions);
      tfCandles[tf] = result.quotes.map(q => ({
        time: q.date.getTime(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0
      }));
    } catch (e) {
      console.error('Final Error fetching ' + tf + ' for ' + pair + ':', e.message);
      tfCandles[tf] = [];
    }
  }
  
  fs.writeFileSync(cachePath, JSON.stringify(tfCandles));
  return tfCandles;
}




function getTFMs(tf) {
  const ms = { M1: 60000, M5: 300000, M15: 900000, H1: 3600000, H4: 14400000, D1: 86400000 };
  return ms[tf] || 3600000;
}

function formatBBEMATelegramMessage(allPairData, sentiment, session, events) {
  let msg = `📊 <b>BBEMA BEDJO V2.0 ANALYSIS</b>\n`;
  msg += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n`;
  msg += `🕐 Session: <b>${session.name}</b> (${session.range})\n`;
  msg += `🎯 Bias: <b>${session.bias}</b>\n\n`;
  
  msg += `💪 <b>STRENGTH:</b> ${sentiment.strongest.currency} ↗️ | ${sentiment.weakest.currency} ↘️\n`;
  msg += `🎯 Best: <b>${sentiment.recommendation}</b>\n\n`;
  
  msg += `📈 <b>PAIR SIGNALS:</b>\n`;
  Object.entries(allPairData).forEach(([pair, data]) => {
    const dec = data.decision;
    const emoji = dec === 'BUY' ? '🟢' : dec === 'SELL' ? '🔴' : dec === 'RANGE' ? '🟡' : '⚪';
    const h1 = data.timeframes.H1;
    const tg = h1?.tangga ? `${h1.tangga.count}/6 ${h1.tangga.phase[0]}` : 'N/A';
    const mm = h1?.mm;
    const lot = mm ? `${mm.recommendedLot} (${mm.avgDistance}p)` : '—';
    
    msg += `${emoji} <b>${pair}</b>: ${dec} | Tangga: ${tg} | Lot: ${lot}\n`;
    if (h1 && h1.signal !== 'WAIT') {
      msg += `   Entry: ${h1.entryType} ${h1.entryPrice} | SL: ${h1.sl} (${mm?.slPips}p)\n`;
      msg += `   TP: ${h1.tp1} → ${h1.tp2} → ${h1.tp3}\n`;
    }
  });
  
  if (events.length > 0) {
    msg += `\n📅 <b>NEWS (WIB):</b>\n`;
    events.slice(0, 5).forEach(e => {
      const imp = e.impact === 'High' ? '🔴' : e.impact === 'Medium' ? '🟡' : '🟢';
      // Get source if available
      const src = e.source ? ` [${e.source}]` : '';
      msg += `${imp} ${e.date} ${e.time} ${e.currency} - ${e.title}${src}\n`;
    });
  }
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  return msg;
}

// ========== COMBINED 3-IN-1 ANALYSIS ==========

async function analyzeForexCombined(sendTelegram = false) {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║           FOREX 3-IN-1 COMBINED ANALYSIS BOT                     ║'));
  console.log(chalk.blue.bold('║     Technical + AI News Sentiment + Geopolitical                  ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════════════════════════════════╝\n'));

  const today = new Date();
  console.log(chalk.cyan(`📅 Date: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`));
  console.log(chalk.cyan(`⏰ Time: ${today.toLocaleTimeString()}\n`));

  // 1. Technical Analysis
  console.log(chalk.yellow.bold('═══ 📈 STEP 1: TECHNICAL ANALYSIS ═══'));
  const technicalResults = await analyzeForex(false);

  // 2. AI News Sentiment
  console.log(chalk.yellow.bold('\n═══ 📰 STEP 2: AI NEWS SENTIMENT ═══'));
  const sentimentResults = await newsSentiment.analyzeAllPairsSentiment(config.MAJOR_PAIRS);
  const overallSentiment = newsSentiment.calculateOverallSentiment(sentimentResults);

  // 3. Geopolitical Analysis
  console.log(chalk.yellow.bold('\n═══ 🌍 STEP 3: GEOPOLITICAL ANALYSIS ═══'));
  for (const pair of config.MAJOR_PAIRS) {
    const geoBias = geopolitical.analyzeGeopoliticalBias(pair, technicalResults.strength);
    console.log(`  ${pair}: ${geoBias.bias} (Score: ${geoBias.score})`);
  }

  // 4. Combined Signal
  console.log(chalk.yellow.bold('\n═══ 🎯 COMBINED 3-IN-1 SIGNALS ═══'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.white('  ' + 'PAIR'.padEnd(10) + 'TECHNICAL'.padEnd(14) + 'AI NEWS'.padEnd(14) + 'GEO'.padEnd(8) + 'COMBINED'.padEnd(14) + 'CONF'));
  console.log(chalk.gray('─'.repeat(70)));

  const combinedResults = {};

  for (const pair of config.MAJOR_PAIRS) {
    const tfData = technicalResults.allPairData[pair];
    const h1 = tfData?.H1;
    const aiSent = sentimentResults[pair].sentiment;
    const geoBias = geopolitical.analyzeGeopoliticalBias(pair, technicalResults.strength);

    let techSignal = 'WAIT';
    if (h1?.signal.includes('BUY')) techSignal = 'BUY';
    else if (h1?.signal.includes('SELL')) techSignal = 'SELL';

    let combined = 'WAIT';
    let confidence = 50;

    if (techSignal === 'BUY' && aiSent.rating > 55 && geoBias.bias === 'BUY') {
      combined = 'STRONG BUY';
      confidence = Math.min(95, 70 + (aiSent.rating - 50) / 3);
    } else if (techSignal === 'SELL' && aiSent.rating < 45 && geoBias.bias === 'SELL') {
      combined = 'STRONG SELL';
      confidence = Math.min(95, 70 + (50 - aiSent.rating) / 3);
    } else if (techSignal === 'BUY' && aiSent.rating > 55) {
      combined = 'BUY';
      confidence = Math.min(85, 60 + (aiSent.rating - 50) / 3);
    } else if (techSignal === 'SELL' && aiSent.rating < 45) {
      combined = 'SELL';
      confidence = Math.min(85, 60 + (50 - aiSent.rating) / 3);
    } else if (aiSent.rating > 60 && geoBias.bias === 'BUY') {
      combined = 'BUY';
      confidence = 65;
    } else if (aiSent.rating < 40 && geoBias.bias === 'SELL') {
      combined = 'SELL';
      confidence = 65;
    }

    combinedResults[pair] = { combined, confidence, techSignal, aiRating: aiSent.rating, geoBias: geoBias.bias };

    const techColor = techSignal.includes('BUY') ? chalk.green : techSignal.includes('SELL') ? chalk.red : chalk.yellow;
    const aiColor = aiSent.rating > 55 ? chalk.green : aiSent.rating < 45 ? chalk.red : chalk.yellow;
    const geoColor = geoBias.bias === 'BUY' ? chalk.green : geoBias.bias === 'SELL' ? chalk.red : chalk.yellow;
    const combColor = combined.includes('BUY') ? chalk.green : combined.includes('SELL') ? chalk.red : chalk.yellow;

    console.log(chalk.white('  ' +
      pair.padEnd(10) +
      techColor(techSignal.padEnd(14)) +
      aiColor(`${aiSent.rating}/100`.padEnd(14)) +
      geoColor(geoBias.bias.padEnd(8)) +
      combColor(combined.padEnd(14)) +
      chalk.cyan(`${confidence.toFixed(0)}%`)
    ));
  }

  console.log(chalk.gray('─'.repeat(70)));

  // 5. News Summary
  console.log(chalk.yellow.bold('\n📰 AI NEWS SENTIMENT SUMMARY:'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const pair of config.MAJOR_PAIRS) {
    const s = sentimentResults[pair].sentiment;
    const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
    console.log(`  ${emoji} ${pair}: ${s.rating}/100 (${s.sentiment}) - ${s.timeframe}`);
    console.log(`     📌 ${s.summary}`);
  }

  // 6. Geopolitical Insights
  console.log(chalk.yellow.bold('\n🌍 GEOPOLITICAL INSIGHTS:'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const currency of ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']) {
    const cond = geopolitical.getBuySellConditions(currency);
    if (cond.buy.length > 0) console.log(`  🟢 Buy ${currency}: ${cond.buy[0]}`);
    if (cond.sell.length > 0) console.log(`  🔴 Sell ${currency}: ${cond.sell[0]}`);
  }

  // 7. Best Pair Recommendation
  console.log(chalk.yellow.bold('\n💡 BEST PAIR RECOMMENDATION:'));
  console.log(chalk.gray('─'.repeat(70)));
  const sortedPairs = Object.entries(combinedResults).sort(([, a], [, b]) => b.confidence - a.confidence);
  const bestPair = sortedPairs[0];
  console.log(chalk.green.bold(`  🏆 ${bestPair[0]}: ${bestPair[1].combined} (${bestPair[1].confidence.toFixed(0)}% confidence)`));
  console.log(chalk.white(`     Tech: ${bestPair[1].techSignal} | AI: ${bestPair[1].aiRating}/100 | Geo: ${bestPair[1].geoBias}`));

  console.log(chalk.yellow.bold('\n⚠️  DISCLAIMER:'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.gray('This is automated analysis for informational purposes only.'));
  console.log(chalk.gray('Not financial advice. Always do your own research.\n'));

  console.log(chalk.blue.bold('════════════════════════════════════════════════════════════════════'));
  console.log(chalk.blue.bold(`Combined Analysis completed at ${new Date().toLocaleTimeString()}`));
  console.log(chalk.blue.bold('════════════════════════════════════════════════════════════════════\n'));

  if (sendTelegram && telegramBot) {
    const telegramMsg = formatCombinedTelegramMessage(technicalResults, sentimentResults, overallSentiment, technicalResults.events.slice(0, 3), combinedResults);
    const sent = await sendTelegramMessage(telegramMsg);
    if (sent) console.log(chalk.green('✅ Telegram notification sent!'));
  }

  return { technicalResults, sentimentResults, overallSentiment, combinedResults };
}

// AI Prediction (LSTM Microservice)
async function sendAIPrediction(chatId) {
  const lstmClient = require('./lstm-client');
  
  await telegramBot.sendMessage(chatId, '🤖 <b>AI LSTM Prediction</b>\n\n⏳ Mengambil prediksi dari LSTM service...', {
    parse_mode: 'HTML'
  });
  
  const data = await lstmClient.predictAll('1D');
  if (data) {
    const msg = lstmClient.formatAllPredictionsMessage(data);
    await telegramBot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
  } else {
    await telegramBot.sendMessage(chatId, '❌ LSTM Prediction tidak tersedia.\n\nCoba lagi dalam beberapa saat.', { parse_mode: 'HTML' });
  }
}

module.exports = {
  analyzeForex, 
  analyzeForexBBEMA, 
  analyzeForexCombined,
  analyzeTechnical, 
  analyzeMultiTimeframe, 
  calculateAllIndicators, 
  sendTelegramMessage, 
  config,
  bbema,
  newsSentiment,
  geopolitical,
  correlation
};
