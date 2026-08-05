const Groq = require('groq-sdk');
const chalk = require('chalk');
const config = require('./config');

let groq = null;

if (config.GROQ_API_KEY && config.GROQ_API_KEY !== 'YOUR_GROQ_API_KEY') {
  groq = new Groq({ apiKey: config.GROQ_API_KEY });
}

const PAIR_SEARCH_MAP = {
  'EUR/USD': { base: 'EUR', quote: 'USD', query: 'EUR USD euro dollar forex' },
  'GBP/USD': { base: 'GBP', quote: 'USD', query: 'GBP USD pound dollar forex' },
  'USD/JPY': { base: 'USD', quote: 'JPY', query: 'USD JPY dollar yen forex' },
  'USD/CHF': { base: 'USD', quote: 'CHF', query: 'USD CHF dollar swiss franc forex' },
  'AUD/USD': { base: 'AUD', quote: 'USD', query: 'AUD USD australian dollar forex' },
  'USD/CAD': { base: 'USD', quote: 'CAD', query: 'USD CAD dollar canadian forex' },
  'NZD/USD': { base: 'NZD', quote: 'USD', query: 'NZD USD new zealand dollar forex' },
  'XAU/USD': { base: 'XAU', quote: 'USD', query: 'XAU USD gold price forex' }
};

async function analyzeWithGroq(pair, articles) {
  if (!groq || articles.length === 0) {
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
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    });

    const text = completion.choices[0].message.content;

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
    if (error.status === 429) {
      return { rating: null, timeframe: 'Unknown', summary: 'QUOTA_EXCEEDED', sentiment: 'NEUTRAL', quotaExceeded: true };
    }
    return { rating: null, timeframe: 'Unknown', summary: 'AI_ERROR', sentiment: 'NEUTRAL', error: true };
  }
}

module.exports = { analyzeWithGroq, PAIR_SEARCH_MAP };
