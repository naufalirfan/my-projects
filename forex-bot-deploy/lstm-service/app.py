from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

def generate_mock_prediction(pair, timeframe='1D'):
    np.random.seed(int(datetime.now().timestamp()) % 10000)
    
    base_prices = {
        'EUR/USD': 1.13895,
        'GBP/USD': 1.27450,
        'USD/JPY': 149.850,
        'USD/CHF': 0.88420,
        'AUD/USD': 0.65120,
        'USD/CAD': 1.36250,
        'NZD/USD': 0.59840,
        'XAU/USD': 2425.50
    }
    
    base_price = base_prices.get(pair, 1.0)
    
    technical_prediction = base_price * (1 + np.random.uniform(-0.005, 0.005))
    fundamental_prediction = base_price * (1 + np.random.uniform(-0.005, 0.005))
    
    ensemble_prediction = (technical_prediction + fundamental_prediction) / 2
    
    actual_change = ((ensemble_prediction - base_price) / base_price) * 100
    
    if actual_change > 0.1:
        direction = 'UP'
        confidence = min(95, 60 + abs(actual_change) * 10)
    elif actual_change < -0.1:
        direction = 'DOWN'
        confidence = min(95, 60 + abs(actual_change) * 10)
    else:
        direction = 'NEUTRAL'
        confidence = 50
    
    rsi = np.random.uniform(30, 70)
    macd_signal = 'BULLISH' if np.random.random() > 0.5 else 'BEARISH'
    
    return {
        'pair': pair,
        'timeframe': timeframe,
        'timestamp': datetime.now().isoformat(),
        'current_price': round(base_price, 5),
        'predictions': {
            'technical': {
                'price': round(technical_prediction, 5),
                'change_percent': round(((technical_prediction - base_price) / base_price) * 100, 4),
                'model': 'LSTM-Technical'
            },
            'fundamental': {
                'price': round(fundamental_prediction, 5),
                'change_percent': round(((fundamental_prediction - base_price) / base_price) * 100, 4),
                'model': 'LSTM-Fundamental'
            },
            'ensemble': {
                'price': round(ensemble_prediction, 5),
                'change_percent': round(actual_change, 4),
                'model': 'Ensemble-LSTM'
            }
        },
        'signal': {
            'direction': direction,
            'confidence': round(confidence, 2),
            'action': 'BUY' if direction == 'UP' else 'SELL' if direction == 'DOWN' else 'WAIT'
        },
        'indicators': {
            'rsi': round(rsi, 2),
            'macd_signal': macd_signal,
            'trend_strength': round(np.random.uniform(40, 90), 2)
        },
        'threshold': {
            'upper': round(base_price * 0.001, 5),
            'lower': round(base_price * -0.001, 5),
            'current_deviation': round(actual_change, 4)
        }
    }

@app.route('/predict/<pair>', methods=['GET'])
def predict(pair):
    timeframe = request.args.get('timeframe', '1D')
    
    pair = pair.replace('-', '/')
    
    valid_pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'XAU/USD']
    
    if pair not in valid_pairs:
        return jsonify({'error': f'Invalid pair. Valid pairs: {", ".join(valid_pairs)}'}), 400
    
    prediction = generate_mock_prediction(pair, timeframe)
    
    return jsonify(prediction)

@app.route('/predict/all', methods=['GET'])
def predict_all():
    timeframe = request.args.get('timeframe', '1D')
    pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'XAU/USD']
    
    predictions = {}
    for pair in pairs:
        predictions[pair] = generate_mock_prediction(pair, timeframe)
    
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'timeframe': timeframe,
        'predictions': predictions,
        'summary': {
            'buy_signals': sum(1 for p in predictions.values() if p['signal']['action'] == 'BUY'),
            'sell_signals': sum(1 for p in predictions.values() if p['signal']['action'] == 'SELL'),
            'wait_signals': sum(1 for p in predictions.values() if p['signal']['action'] == 'WAIT')
        }
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'LSTM Forex Prediction', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    print("LSTM Forex Prediction Service starting...")
    print("Available endpoints:")
    print("   GET /predict/<pair> - Predict specific pair")
    print("   GET /predict/all - Predict all pairs")
    print("   GET /health - Health check")
    print("Running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
