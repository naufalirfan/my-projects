#!/bin/bash
# Backup script for Forex Bot - save all configs & data
# Usage: bash backup.sh

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR=~/forex-bot-backup-$TIMESTAMP

echo "========================================"
echo "  FOREX BOT BACKUP"
echo "========================================"

# 1. Create backup folder
mkdir -p $BACKUP_DIR

# 2. Backup project (exclude node_modules, logs)
echo "[1/4] Copying project files..."
cd ~/forex-bot1
rsync -av --exclude='node_modules' --exclude='*.log' ./ $BACKUP_DIR/

# 3. Backup PM2 config
echo "[2/4] Saving PM2 config..."
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2-dump.json 2>/dev/null || true

# 4. Create restore script inside backup
echo "[3/4] Creating restore script..."
cat > $BACKUP_DIR/restore.sh << 'RESTORE_EOF'
#!/bin/bash
# Restore script - run this on the NEW server
# Usage: bash restore.sh

set -e

echo "========================================"
echo "  FOREX BOT RESTORE / MIGRATION"
echo "========================================"

# 1. Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "[1/5] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt install -y nodejs
else
  echo "[1/5] Node.js $(node -v) already installed"
fi

# 2. Install PM2
echo "[2/5] Installing PM2..."
sudo npm install -g pm2

# 3. Copy project to home
echo "[3/5] Copying project to ~/forex-bot1..."
cd ~
rm -rf ~/forex-bot1
cp -r $(dirname "$0") ~/forex-bot1

# 4. Install dependencies
echo "[4/5] Installing dependencies..."
cd ~/forex-bot1
npm install undici@5.28.5
npm install

# 5. Start bot
echo "[5/5] Starting bot..."
pm2 start index.js --name forex-bot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo ""
echo "========================================"
echo "  RESTORE COMPLETE!"
echo "========================================"
echo ""
echo "Check status: pm2 status"
echo "View logs:    pm2 logs forex-bot"
echo "Send /start to your Telegram bot"
RESTORE_EOF

chmod +x $BACKUP_DIR/restore.sh

# 5. Create archive
echo "[4/4] Creating archive..."
cd ~
tar -czf forex-bot-backup-$TIMESTAMP.tar.gz $(basename $BACKUP_DIR)
rm -rf $BACKUP_DIR

echo ""
echo "========================================"
echo "  BACKUP COMPLETE!"
echo "========================================"
echo ""
echo "Backup file: ~/forex-bot-backup-$TIMESTAMP.tar.gz"
echo ""
echo "TO MIGRATE TO NEW SERVER:"
echo "1. Download backup file:"
echo "   sz ~/forex-bot-backup-$TIMESTAMP.tar.gz"
echo ""
echo "2. Upload to new server:"
echo "   scp forex-bot-backup-$TIMESTAMP.tar.gz user@new-server:~"
echo ""
echo "3. SSH to new server and run:"
echo "   tar -xzf forex-bot-backup-$TIMESTAMP.tar.gz"
echo "   cd forex-bot-backup-*"
echo "   bash restore.sh"
echo ""
