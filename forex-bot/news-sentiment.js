const fetch = require('node-fetch');
const { GoogleGenAI } = require('@google/genai');
const { analyzeWithGroq } = require('./groq-sentiment');
const chalk = require('chalk');
const config = require('./config');

let genAI = null;

if (config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
  genAI = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
}

const DELAY_BETWEEN_PAIRS_MS = 3000;
const MAX_RETRIES = 2;

const PAIR_SEARCH_MAP = {
  'EUR/USD': { base: 'EUR', quote: 'USD', query: 'EUR USD forex' },
  'GBP/USD': { base: 'GBP', quote: 'USD', query: 'GBP USD forex' },
  'USD/JPY': { base: 'USD', quote: 'JPY', query: 'USD JPY forex' },
  'USD/CHF': { base: 'USD', quote: 'CHF', query: 'USD CHF forex' },
  'AUD/USD': { base: 'AUD', quote: 'USD', query: 'AUD USD forex' },
  'USD/CAD': { base: 'USD', quote: 'CAD', query: 'USD CAD forex' },
  'NZD/USD': { base: 'NZD', quote: 'USD', query: 'NZD USD forex' },
  'XAU/USD': { base: 'XAU', quote: 'USD', query: 'gold price USD' }
};

function parseXMLItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  
  for (const item of itemMatches) {
    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    const pubDate = extractTag(item, 'pubDate');
    const description = extractTag(item, 'description');
    
    if (title) {
      items.push({ title, link, pubDate, description: stripHTML(description || '') });
    }
  }
  return items;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return '';
  return (match[1] || match[2] || '').trim();
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BULLISH_WORDS = ['rally', 'surge', 'gain', 'rise', 'up', 'high', 'strong', 'bullish', 'growth', 'positive', 'upgrade', 'beat', 'stronger'];
const BEARISH_WORDS = ['fall', 'drop', 'decline', 'down', 'low', 'weak', 'bearish', 'recession', 'negative', 'downgrade', 'miss', 'weaker', 'crash', 'plunge'];

function simpleSentimentFromTitle(title, baseCurrency, quoteCurrency) {
  const lower = title.toLowerCase();
  let score = 50;
  
  for (const word of BULLISH_WORDS) {
    if (lower.includes(word)) score += 5;
  }
  for (const word of BEARISH_WORDS) {
    if (lower.includes(word)) score -= 5;
  }
  
  if (lower.includes(baseCurrency.toLowerCase())) {
    if (score > 50) score += 5;
    else if (score < 50) score -= 5;
  }
  if (lower.includes(quoteCurrency.toLowerCase())) {
    if (score > 50) score -= 3;
    else if (score < 50) score += 3;
  }
  
  score = Math.max(20, Math.min(80, score));
  
  let sentiment = 'NEUTRAL';
  if (score > 60) sentiment = 'BULLISH';
  else if (score < 40) sentiment = 'BEARISH';
  else if (score > 55) sentiment = 'SLIGHT_BULLISH';
  else if (score < 45) sentiment = 'SLIGHT_BEARISH';
  
  return { rating: score, timeframe: 'Short-term', summary: `Simple analysis based on ${title.substring(0, 50)}...`, sentiment };
}

async function fetchGoogleNewsRSS(query, maxArticles = 5) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const xml = await response.text();
    const items = parseXMLItems(xml);
    return items.slice(0, maxArticles);
  } catch (error) {
    return [];
  }
}

async function analyzeSentimentWithGemini(pair, articles, retryCount = 0) {
  if (!genAI || articles.length === 0) {
    return { rating: 50, timeframe: 'Unknown', summary: 'No data available', sentiment: 'NEUTRAL' };
  }

  const info = PAIR_SEARCH_MAP[pair] || { base: pair.slice(0, 3), quote: pair.slice(3, 6) };
  const articleTexts = articles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');

  const prompt = `Analyze the following forex news articles about ${pair}. Follow these rules strictly:

Rating System:
- If the news is positive for ${info.base} (first currency), increase the rating.
- If the news is positive for ${info.quote} (second currency), decrease the rating.
- Use a scale of 0 to 100:
  - Above 50: Bullish for ${info.base} (first currency)
  - Below 50: Bearish for ${info.base} (first currency)
  - 50: Neutral or insignificant news

Timeframe Classification:
- Short-term: News likely to impact within days
- Mid-term: News likely to impact within weeks
- Long-term: News likely to impact over months

Articles:
${articleTexts}

Respond in this EXACT format (nothing else):
RATING: [number]/100
TIMEFRAME: [Short-term/Mid-term/Long-term]
SUMMARY: [one line summary of overall sentiment]`;

  try {
    const result = await genAI.models.generateContent({
      model: config.AI_NEWS.geminiModel || 'gemini-2.0-flash',
      contents: prompt
    });
    const text = result.text;

    const ratingMatch = text.match(/RATING:\s*(\d+)/i);
    const tfMatch = text.match(/TIMEFRAME:\s*(Short-term|Mid-term|Long-term)/i);
    const summaryMatch = text.match(/SUMMARY:\s*(.+)/i);

    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 50;
    const timeframe = tfMatch ? tfMatch[1] : 'Unknown';
    const summary = summaryMatch ? summaryMatch[1].trim() : 'No summary';
    
    let sentiment = 'NEUTRAL';
    if (rating > 60) sentiment = 'BULLISH';
    else if (rating < 40) sentiment = 'BEARISH';
    else if (rating > 55) sentiment = 'SLIGHT_BULLISH';
    else if (rating < 45) sentiment = 'SLIGHT_BEARISH';

    return { rating, timeframe, summary, sentiment };
  } catch (error) {
    if (error.message && error.message.includes('429')) {
      return { rating: null, timeframe: 'Unknown', summary: 'QUOTA_EXCEEDED', sentiment: 'NEUTRAL', quotaExceeded: true };
    }
    if (error.status === 429 && retryCount < MAX_RETRIES) {
      const waitTime = (retryCount + 1) * 10000;
      console.log(chalk.yellow(`  ⏳ Rate limited. Waiting ${waitTime/1000}s before retry...`));
      await delay(waitTime);
      return analyzeSentimentWithGemini(pair, articles, retryCount + 1);
    }
    return { rating: null, timeframe: 'Unknown', summary: 'AI_ERROR', sentiment: 'NEUTRAL', error: true };
  }
}

async function analyzePairSentiment(pair, maxArticles = 3) {
  const info = PAIR_SEARCH_MAP[pair];
  if (!info) return null;

  console.log(chalk.cyan(`  📰 Fetching news for ${pair}...`));
  const articles = await fetchGoogleNewsRSS(info.query, maxArticles);
  
  if (articles.length === 0) {
    return {
      pair,
      articles: [],
      sentiment: { rating: 50, timeframe: 'Unknown', summary: 'No articles found', sentiment: 'NEUTRAL' }
    };
  }

  // Step 1: Try Gemini
  const geminiSentiment = await analyzeSentimentWithGemini(pair, articles);
  if (geminiSentiment.rating !== null && !geminiSentiment.quotaExceeded && !geminiSentiment.error) {
    return { pair, articles, sentiment: geminiSentiment, provider: 'Gemini' };
  }

  // Step 2: Try Groq
  const groqSentiment = await analyzeWithGroq(pair, articles);
  if (groqSentiment.rating !== null && !groqSentiment.quotaExceeded && !groqSentiment.error) {
    return { pair, articles, sentiment: groqSentiment, provider: 'Groq' };
  }

  // Step 3: Fallback to simple keyword analysis
  let avgRating = 50;
  for (const article of articles) {
    const simple = simpleSentimentFromTitle(article.title, info.base, info.quote);
    avgRating += simple.rating;
  }
  avgRating = Math.round(avgRating / (articles.length + 1));
  
  let sentiment = 'NEUTRAL';
  if (avgRating > 60) sentiment = 'BULLISH';
  else if (avgRating < 40) sentiment = 'BEARISH';
  else if (avgRating > 55) sentiment = 'SLIGHT_BULLISH';
  else if (avgRating < 45) sentiment = 'SLIGHT_BEARISH';
  
  return {
    pair,
    articles,
    sentiment: { rating: avgRating, timeframe: 'Short-term', summary: `Simple analysis (${articles.length} articles)`, sentiment },
    provider: 'Simple'
  };
}

async function analyzeAllPairsSentiment(pairs) {
  console.log(chalk.blue.bold('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║           📰 AI NEWS SENTIMENT ANALYSIS                     ║'));
  console.log(chalk.blue.bold('╚══════════════════════════════════════════════════════════════╝\n'));

  const results = {};
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    try {
      const result = await analyzePairSentiment(pair, 2);
      results[pair] = result;
      
      const s = result.sentiment;
      const emoji = s.sentiment === 'BULLISH' ? '🟢' : s.sentiment === 'BEARISH' ? '🔴' : '🟡';
      const provider = result.provider || 'Unknown';
      console.log(chalk.white(`  ${emoji} ${pair}: ${s.rating}/100 (${s.sentiment}) [${provider}]`));
    } catch (error) {
      console.log(chalk.red(`  ❌ ${pair}: Error - ${error.message}`));
      results[pair] = { pair, articles: [], sentiment: { rating: 50, timeframe: 'Unknown', summary: 'Error', sentiment: 'NEUTRAL' } };
    }

    if (i < pairs.length - 1) {
      await delay(2000);
    }
  }

  return results;
}

function calculateOverallSentiment(allSentimentResults) {
  const pairs = Object.keys(allSentimentResults);
  if (pairs.length === 0) return { strongest: 'N/A', weakest: 'N/A', average: 50, bias: 'NEUTRAL' };

  let sum = 0;
  let strongest = { pair: '', rating: 0 };
  let weakest = { pair: '', rating: 100 };

  for (const pair of pairs) {
    const rating = allSentimentResults[pair].sentiment.rating;
    sum += rating;
    if (rating > strongest.rating) strongest = { pair, rating };
    if (rating < weakest.rating) weakest = { pair, rating };
  }

  const average = Math.round(sum / pairs.length);
  let bias = 'NEUTRAL';
  if (average > 55) bias = 'RISK_ON';
  else if (average < 45) bias = 'RISK_OFF';

  return { strongest: strongest.pair, weakest: weakest.pair, average, bias };
}

module.exports = {
  fetchGoogleNewsRSS,
  analyzeSentimentWithGemini,
  analyzePairSentiment,
  analyzeAllPairsSentiment,
  calculateOverallSentiment,
  PAIR_SEARCH_MAP
};
