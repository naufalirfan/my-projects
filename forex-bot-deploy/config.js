// Try to load .env file (optional - won't fail if dotenv not installed)
try {
  require('dotenv').config();
} catch (_) {}

module.exports = {
  TELEGRAM_BOT_ENABLED: process.env.TELEGRAM_BOT_ENABLED || 'true',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY',
  GROQ_API_KEY: process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY',
  
  MAJOR_PAIRS: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'XAU/USD'],
  
  TECHNICAL: {
    periods: {
      short: 20,
      medium: 50,
      long: 200
    },
    rsi: {
      overbought: 70,
      oversold: 30
    }
  },
  
  FUNDAMENTAL: {
    updateInterval: 24 * 60 * 60 * 1000,
    maxEvents: 15
  },
  
  AI_NEWS: {
    enabled: true,
    maxArticlesPerPair: 2,
    geminiModel: 'gemini-2.0-flash',
    delayBetweenPairsMs: 3000
  },
  
  GEOPOLITICAL: {
    enabled: true,
    showInsights: true
  },
  
  CORRELATION: {
    enabled: true,
    minStrength: 75
  }
};