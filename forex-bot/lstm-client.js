const axios = require('axios');
const chalk = require('chalk');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LSTM_SERVICE_URL = process.env.LSTM_SERVICE_URL || 'http://localhost:5000';
let pythonProcess = null;
let serviceReady = false;

const LSTM_DIR = path.join(__dirname, 'lstm-service');

function isPythonInstalled() {
  try {
    const { execSync } = require('child_process');
    execSync('python --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow('📦 Installing Python dependencies...'));
    const pip = spawn('pip', ['install', '-r', 'requirements.txt'], { 
      cwd: LSTM_DIR, 
      stdio: 'pipe' 
    });
    pip.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('✅ Dependencies installed'));
        resolve();
      } else {
        reject(new Error('pip install failed'));
      }
    });
  });
}

function startService() {
  return new Promise((resolve) => {
    if (pythonProcess) {
      resolve(true);
      return;
    }

    if (!isPythonInstalled()) {
      console.log(chalk.red('❌ Python not found! LSTM Prediction tidak tersedia.'));
      console.log(chalk.gray('   Install Python dari https://python.org'));
      resolve(false);
      return;
    }

    console.log(chalk.cyan('🤖 Starting LSTM Service...'));
    pythonProcess = spawn('python', ['app.py'], {
      cwd: LSTM_DIR,
      detached: true,
      stdio: 'ignore'
    });
    pythonProcess.unref();

    pythonProcess.on('error', (err) => {
      console.log(chalk.red('❌ LSTM Service gagal start:'), err.message);
      pythonProcess = null;
      resolve(false);
    });

    pythonProcess.on('close', () => {
      console.log(chalk.yellow('⚠️ LSTM Service stopped'));
      pythonProcess = null;
      serviceReady = false;
    });

    // Tunggu service ready
    let attempts = 0;
    const check = setInterval(async () => {
      attempts++;
      try {
        await axios.get(`${LSTM_SERVICE_URL}/health`, { timeout: 2000 });
        clearInterval(check);
        serviceReady = true;
        console.log(chalk.green('✅ LSTM Service ready di port 5000'));
        resolve(true);
      } catch {
        if (attempts > 10) {
          clearInterval(check);
          console.log(chalk.red('❌ LSTM Service timeout'));
          resolve(false);
        }
      }
    }, 1000);
  });
}

function stopService() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    serviceReady = false;
    console.log(chalk.yellow('🛑 LSTM Service stopped'));
  }
}

async function healthCheck() {
  if (!serviceReady) return false;
  try {
    const response = await axios.get(`${LSTM_SERVICE_URL}/health`, { timeout: 3000 });
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
}

async function predictPair(pair, timeframe = '1D') {
  if (!serviceReady) {
    const started = await startService();
    if (!started) return null;
  }
  try {
    const safePair = pair.replace('/', '-');
    const response = await axios.get(`${LSTM_SERVICE_URL}/predict/${safePair}`, {
      params: { timeframe },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Error predicting ${pair}:`), error.message);
    return null;
  }
}

async function predictAll(timeframe = '1D') {
  if (!serviceReady) {
    const started = await startService();
    if (!started) return null;
  }
  try {
    const response = await axios.get(`${LSTM_SERVICE_URL}/predict/all`, {
      params: { timeframe },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red('Error predicting all pairs:'), error.message);
    return null;
  }
}

function formatPredictionMessage(prediction) {
  if (!prediction) {
    return '❌ <b>Error:</b> Tidak dapat mengambil prediksi LSTM';
  }
  
  const action = prediction.signal.action;
  const emoji = action === 'BUY' ? '🟢' : action === 'SELL' ? '🔴' : '🟡';
  const trendEmoji = prediction.predictions.ensemble.change_percent > 0 ? '📈' : '📉';
  
  let msg = `🤖 <b>AI LSTM PREDICTION</b>\n`;
  msg += `by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
  msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
  
  msg += `${emoji} <b>${prediction.pair}</b>\n`;
  msg += `💰 Harga: <b>${prediction.current_price}</b>\n\n`;
  
  msg += `📊 <b>PREDIKSI LSTM:</b>\n`;
  msg += `• Technical: ${prediction.predictions.technical.price} (${prediction.predictions.technical.change_percent > 0 ? '+' : ''}${prediction.predictions.technical.change_percent}%)\n`;
  msg += `• Fundamental: ${prediction.predictions.fundamental.price} (${prediction.predictions.fundamental.change_percent > 0 ? '+' : ''}${prediction.predictions.fundamental.change_percent}%)\n`;
  msg += `• Ensemble: ${prediction.predictions.ensemble.price} (${prediction.predictions.ensemble.change_percent > 0 ? '+' : ''}${prediction.predictions.ensemble.change_percent}%)\n\n`;
  
  msg += `📈 <b>INDICATORS:</b>\n`;
  msg += `• RSI: ${prediction.indicators.rsi}\n`;
  msg += `• MACD: ${prediction.indicators.macd_signal}\n`;
  msg += `• Trend: ${prediction.indicators.trend_strength}%\n\n`;
  
  msg += `🎯 <b>SIGNAL:</b> ${action} (${prediction.signal.confidence}%)\n`;
  msg += `${trendEmoji} Arah: <b>${prediction.signal.direction}</b>\n`;
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  
  return msg;
}

function formatAllPredictionsMessage(data) {
  if (!data || !data.predictions) {
    return '❌ <b>Error:</b> Tidak dapat mengambil prediksi';
  }
  
  let msg = `🤖 <b>AI LSTM PREDICTION - SEMUA PAIR</b>\n`;
  msg += `by <a href="https://instagram.com/naufal_irfansyah">Naufal Irfansyah</a>\n`;
  msg += `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;
  
  msg += `📊 <b>SUMMARY:</b>\n`;
  msg += `🟢 Buy: ${data.summary.buy_signals} | 🔴 Sell: ${data.summary.sell_signals} | 🟡 Wait: ${data.summary.wait_signals}\n\n`;
  
  for (const [pair, pred] of Object.entries(data.predictions)) {
    const action = pred.signal.action;
    const emoji = action === 'BUY' ? '🟢' : action === 'SELL' ? '🔴' : '🟡';
    const change = pred.predictions.ensemble.change_percent;
    
    msg += `${emoji} <b>${pair}</b>: ${pred.current_price}\n`;
    msg += `  ${action} (${pred.signal.confidence}%) | ${change > 0 ? '+' : ''}${change}%\n`;
  }
  
  msg += `\n⚠️ <i>Hanya edukasi. Bukan saran keuangan.</i>`;
  
  return msg;
}

module.exports = {
  startService,
  stopService,
  healthCheck,
  predictPair,
  predictAll,
  formatPredictionMessage,
  formatAllPredictionsMessage,
  LSTM_SERVICE_URL
};
