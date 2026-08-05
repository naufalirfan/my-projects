import sys

file_path = r'C:\Users\user\Documents\Default Project\forex-bot\index.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = \"\"\"async function generateMultiTFCandles(pair) {
  const yahooFinance = require('yahoo-finance2').default;
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

  for (const [tf, interval] of Object.entries(intervals)) {
    try {
      const queryOptions = { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      const result = await yahooFinance.chart(symbol, { interval, ...queryOptions });
      tfCandles[tf] = result.quotes.map(q => ({
        time: q.date.getTime(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0
      }));
    } catch (e) {
      console.error('Error fetching ' + tf + ' for ' + pair + ':', e.message);
      tfCandles[tf] = [];
    }
  }
  return tfCandles;
}\"\"\"

start_marker = 'function generateMultiTFCandles(pair) {'
end_marker = 'return tfCandles;\n}'

start_index = content.find(start_marker)
end_index = content.find(end_marker, start_index) + len(end_marker)

new_content = content[:start_index] + new_func + content[end_index:]
new_content = new_content.replace('generateMultiTFCandles(', 'await generateMultiTFCandles(')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
