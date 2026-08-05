# Forex AI-Powered 3-in-1 Analysis Bot

Bot analisis forex harian dengan 3 fitur utama: Technical Analysis, AI News Sentiment (Gemini), dan Geopolitical Analysis.

## Features

### 1. 📈 Technical Analysis
- Multi-timeframe analysis (M1, M5, M15, H1, H4, D1)
- Indicators: RSI, MACD, SMA/EMA, Bollinger Bands, Stochastic
- BBEMA Bedjo V2.0 (EMA Tangga, BB Multi-Layer, Candle Counting)
- Moving Average Crossover signals

### 2. 📰 AI News Sentiment
- Google News RSS (gratis, tanpa API key)
- Gemini AI sentiment analysis (rating 0-100)
- Klasifikasi Short/Mid/Long-term impact
- Bullish/Bearish/Neutral sentiment

### 3. 🌍 Geopolitical Analysis
- Most traded pairs per mata uang
- Import/Export data (ekonomi fundamental)
- Buy/Sell conditions berdasarkan kondisi geopolitik
- Currency correlations dengan instrumen lain

### 4. 🎯 Combined 3-in-1 Analysis
- Gabungan Technical + AI News + Geopolitical
- Confidence scoring (0-95%)
- Best pair recommendation
- Signal filtering (AI konfirmasi BBEMA)

## Installation

```bash
cd forex-bot
npm install
```

## Configuration

Buat file `.env` dari `.env.example`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Mendapatkan Gemini API Key:
1. Kunjungi https://aistudio.google.com/apikey
2. Login dengan Google account
3. Klik "Create API Key"
4. Copy API key ke `.env`

## Usage

### Run analisis gabungan (Recommended):
```bash
npm run combined
```

### Run analisis teknikal saja:
```bash
npm start
```

### Run analisis BBEMA:
```bash
npm run bbema
```

### Run AI News Sentiment:
```bash
npm run sentiment
```

### Run dengan Telegram notification:
```bash
npm run telegram-combined
```

### Run scheduled (harian jam 8 pagi):
```bash
npm run schedule
```

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message dengan menu |
| `/analyze` | Analisis teknikal semua pair |
| `/bbema` | Analisis BBEMA V2.0 |
| `/sentiment` | AI News Sentiment analysis |
| `/geopolitical` | Geopolitical analysis |
| `/correlation USD` | Currency correlation |
| `/combined` | Combined 3-in-1 analysis |
| `/pairs` | Daftar pair tersedia |
| `/help` | Bantuan |

## Telegram Keyboard Menu

| Button | Description |
|--------|-------------|
| 📈 Analisis Semua Pair | Analisis teknikal 8 pair |
| 🔄 Refresh Data Terbaru | Update data terbaru |
| 📋 Pilih Pair Spesifik | Pilih pair tertentu |
| 📊 Analisis BBEMA V2.0 | BBEMA reversal/follow |
| 📰 AI Sentimen | Gemini AI sentiment |
| 🌍 Geopolitik | Data geopolitik |
| 🔗 Korelasi | Currency correlations |
| 🎯 Gabungan 3-in-1 | Analisis gabungan |

## Output Example

### Combined 3-in-1 Analysis:
```
╔══════════════════════════════════════════════════════════════╗
║           FOREX 3-IN-1 COMBINED ANALYSIS BOT                ║
╚══════════════════════════════════════════════════════════════╝

═══ 📈 STEP 1: TECHNICAL ANALYSIS ═══
💪 CURRENCY STRENGTH:
EUR: █████████ (9) | USD: █████ (5)

═══ 📰 STEP 2: AI NEWS SENTIMENT ═══
📰 AI NEWS SENTIMENT ANALYSIS
🟢 EUR/USD: 72/100 (BULLISH) - Short-term
🟡 GBP/USD: 51/100 (NEUTRAL) - Mid-term
🔴 USD/JPY: 28/100 (BEARISH) - Long-term

═══ 🌍 STEP 3: GEOPOLITICAL ANALYSIS ═══
EUR/USD: BUY (Score: 2)

═══ 🎯 COMBINED 3-IN-1 SIGNALS ═══
PAIR     TECHNICAL    AI NEWS      GEO      COMBINED      CONF
EUR/USD  BUY          72/100       BUY      STRONG BUY    92%
GBP/USD  WAIT         51/100       NEUTRAL  WAIT          50%
USD/JPY  SELL         28/100       SELL     STRONG SELL   88%

💡 BEST PAIR RECOMMENDATION:
🏆 EUR/USD: STRONG BUY (92% confidence)
```

## File Structure

```
forex-bot/
├── index.js              # Main bot logic + Telegram
├── bbema.js              # BBEMA Bedjo V2.0 strategy
├── news-sentiment.js     # AI News Sentiment (Gemini)
├── geopolitical.js       # Geopolitical data
├── correlation.js        # Currency correlations
├── config.js             # Configuration
├── scheduler.js          # Cron job scheduler
├── .env                  # Environment variables
└── package.json          # Dependencies
```

## Technical Indicators

- **RSI (Relative Strength Index)**: Overbought (>70), Oversold (<30)
- **MACD**: Bullish/Bearish crossover
- **SMA/EMA**: Trend direction (20, 50, 200 period)
- **Bollinger Bands**: Volatility + mean reversion
- **Stochastic**: Overbought/Oversold zones

## BBEMA Bedjo V2.0

- **EMA Tangga**: 13, 18, 28 (Benteng & Trigger)
- **BB Multi-Layer**: 2.0, 2.3, 2.5 (Target & Reversal Zone)
- **Candle Counting**: 1-3 Follow, 4-6 Reversal
- **Session-Based**: Asia, Eropa, Amerika
- **Money Management**: Buffer 500p, Lev 1:50

## Cron Schedule

Default: `0 8 * * *` (jam 8 pagi setiap hari)

Untuk mengubah jadwal, edit `scheduler.js`:
```javascript
cron.schedule('0 8 * * *', runAnalysis, {
  timezone: 'Asia/Jakarta'
});
```

## Credits

- **Technical Analysis**: Original forex-bot
- **AI News Sentiment**: Adapted from [AI-FX-News-Analyser](https://github.com/YoussefBechara/AI-FX-News-Analyser-YSFB)
- **Geopolitical Analysis**: Adapted from [Currency-Geopolitical-Analyser](https://github.com/YoussefBechara/Currency-Geopolical-Analyser)

## Disclaimer

Bot ini untuk keperluan edukasi saja. Bukan financial advice. Selalu lakukan riset sendiri sebelum trading.
