# Forex Bot - Deploy Guide

## Quick Deploy (Auto)

### Windows
```bash
deploy.bat
```

### Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deploy

### 1. Upload Files
Upload folder `forex-bot` ke VPS (exclude `node_modules/` dan `.env`)

```bash
# Dari local PC
rsync -av --exclude='node_modules' --exclude='.env' ./ root@VPS_IP:/root/forex-bot
```

### 2. Setup VPS

```bash
# SSH ke VPS
ssh root@VPS_IP

# Masuk folder
cd /root/forex-bot

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt update
sudo apt install python3-pip python3-venv -y

# Install dependencies
npm install
cd lstm-service
pip3 install -r requirements.txt
cd ..
```

### 3. Buat .env
```bash
nano .env
```

Paste:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
TELEGRAM_BOT_ENABLED=true
```

### 4. Run as Service

```bash
# Buat service file
sudo tee /etc/systemd/system/forex-bot.service > /dev/null << 'EOF'
[Unit]
Description=Forex Analysis Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/forex-bot
ExecStart=/usr/bin/node -e "require('./index').analyzeForexCombined(true)"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable dan start
sudo systemctl daemon-reload
sudo systemctl enable forex-bot
sudo systemctl start forex-bot
```

### 5. Manage Service

```bash
# Cek status
sudo systemctl status forex-bot

# Restart
sudo systemctl restart forex-bot

# Stop
sudo systemctl stop forex-bot

# Lihat logs
sudo journalctl -u forex-bot -f
```

## Troubleshooting

### Bot tidak start
```bash
sudo journalctl -u forex-bot -n 50
```

### LSTM Service error
```bash
cd /root/forex-bot/lstm-service
python3 app.py
```

### Port 5000 sudah dipakai
```bash
sudo lsof -i :5000
sudo kill -9 PID
```

## Files Structure
```
/root/forex-bot/
├── index.js
├── config.js
├── .env
├── package.json
├── lstm-client.js
├── news-sentiment.js
├── groq-sentiment.js
├── geopolitical.js
├── correlation.js
├── forex-data-analysis.js
├── bbema.js
├── scheduler.js
└── lstm-service/
    ├── app.py
    └── requirements.txt
```
