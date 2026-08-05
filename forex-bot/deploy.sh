#!/bin/bash

echo "========================================"
echo "  Forex Bot - Deploy to VPS"
echo "========================================"
echo

# Get VPS info
read -p "Masukkan IP VPS: " VPS_IP
read -p "Masukkan Username VPS (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}

echo
echo "📦 Menyiapkan file untuk deploy..."

# Create temp deploy folder
DEPLOY_DIR="/tmp/forex-bot-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy files (exclude node_modules, .env, .git)
rsync -av --exclude='node_modules' --exclude='.env' --exclude='.git' --exclude='*.log' \
    ./ $DEPLOY_DIR/

# Create tar archive
echo
echo "📦 Membuat archive..."
cd /tmp
tar -czf forex-bot.tar.gz forex-bot-deploy

# Upload to VPS
echo
echo "📤 Upload ke VPS $VPS_IP..."
scp forex-bot.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Setup on VPS
echo
echo "🔧 Setup di VPS..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /tmp
tar -xzf forex-bot.tar.gz
rm -rf /root/forex-bot
mv forex-bot-deploy /root/forex-bot
cd /root/forex-bot

# Install Node.js if not exists
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Python if not exists
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    sudo apt update
    sudo apt install python3-pip python3-venv -y
fi

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

# Install Python dependencies
echo "Installing Python dependencies..."
cd lstm-service
pip3 install -r requirements.txt
cd ..

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env..."
    cat > .env << 'ENVEOF'
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
TELEGRAM_BOT_ENABLED=true
ENVEOF
fi

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/forex-bot.service > /dev/null << 'SERVICEEOF'
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
SERVICEEOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable forex-bot
sudo systemctl restart forex-bot

echo
echo "✅ Deploy selesai!"
echo
echo "Cek status: sudo systemctl status forex-bot"
echo "Cek logs: sudo journalctl -u forex-bot -f"
echo "Restart: sudo systemctl restart forex-bot"
ENDSSH

# Cleanup
echo
echo "🧹 Membersihkan file temporary..."
rm -rf /tmp/forex-bot.tar.gz $DEPLOY_DIR

echo
echo "========================================"
echo "  Deploy selesai!"
echo "========================================"
