#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "============================================"
echo "   9ROUTER AUTO-INSTALLER + HERMES CONNECT"
echo "============================================"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Jalankan sebagai root!${NC}"
  echo "Cara: sudo bash 9router-hermes-install.sh"
  exit 1
fi

HERMES_USER="hermes"
HERMES_HOME="/home/$HERMES_USER"
HERMES_CONFIG="$HERMES_HOME/.hermes/config.yaml"
HERMES_ENV="$HERMES_HOME/.hermes/.env"
PORT=20128

# 1. Install Node.js (if not exists)
echo -e "${YELLOW}[1/6] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
echo -e "${GREEN}Node.js: $(node --version)${NC}"

# 2. Install 9Router
echo -e "${YELLOW}[2/6] Installing 9Router...${NC}"
npm install -g 9router
echo -e "${GREEN}9Router installed!${NC}"

# 3. Create systemd service for 9Router
echo -e "${YELLOW}[3/6] Creating 9Router service...${NC}"
cat > /etc/systemd/system/9router.service <<EOF
[Unit]
Description=9Router AI Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$HERMES_USER
Group=$HERMES_USER
WorkingDirectory=$HERMES_HOME
ExecStart=/usr/bin/9router --port $PORT
Restart=on-failure
RestartSec=5
Environment=HOME=$HERMES_HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable 9router
systemctl start 9router

# Wait for 9Router to start
sleep 3

# Check if 9Router is running
if systemctl is-active --quiet 9router; then
  echo -e "${GREEN}9Router is running on port $PORT!${NC}"
else
  echo -e "${RED}9Router failed to start. Check: systemctl status 9router${NC}"
  exit 1
fi

# 4. Configure Hermes to use 9Router
echo -e "${YELLOW}[4/6] Configuring Hermes...${NC}"

# Backup existing config
if [ -f "$HERMES_CONFIG" ]; then
  cp "$HERMES_CONFIG" "$HERMES_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Write new config
cat > "$HERMES_CONFIG" <<'EOF'
model:
  provider: custom
  base_url: http://localhost:20128/v1
  default: groq/llama-3.3-70b-versatile
  fallback_providers:
    - provider: custom
      model: groq/llama-3.1-8b-instant
    - provider: custom
      model: groq/mixtral-8x7b-32768
    - provider: custom
      model: openai/gpt-4o-mini
    - provider: custom
      model: anthropic/claude-3-haiku
    - provider: custom
      model: google/gemini-2.0-flash-001
EOF

# Set ownership
chown $HERMES_USER:$HERMES_USER "$HERMES_CONFIG"

echo -e "${GREEN}Hermes config updated!${NC}"

# 5. Create .env if not exists
echo -e "${YELLOW}[5/6] Checking .env...${NC}"
if [ ! -f "$HERMES_ENV" ]; then
  echo "OPENAI_API_KEY=sk-9router-local" > "$HERMES_ENV"
  chmod 600 "$HERMES_ENV"
  chown $HERMES_USER:$HERMES_USER "$HERMES_ENV"
  echo -e "${GREEN}.env created!${NC}"
else
  echo -e "${GREEN}.env already exists.${NC}"
fi

# 6. Restart Hermes Gateway
echo -e "${YELLOW}[6/6] Restarting Hermes Gateway...${NC}"
systemctl restart hermes-gateway

sleep 2

if systemctl is-active --quiet hermes-gateway; then
  echo -e "${GREEN}Hermes Gateway is running!${NC}"
else
  echo -e "${RED}Hermes Gateway failed to start.${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   INSTALASI SELESAI!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "9Router Dashboard: ${BLUE}http://YOUR_VPS_IP:$PORT/dashboard${NC}"
echo ""
echo "Selanjutnya:"
echo "1. Buka dashboard 9Router di browser"
echo "2. Login dan connect provider (Groq/OpenRouter)"
echo "3. Masukkan API key masing-masing provider"
echo "4. Coba kirim pesan ke bot Telegram"
echo ""
echo "Perintah:"
echo "  systemctl status 9router        # Cek status 9Router"
echo "  systemctl status hermes-gateway  # Cek status Hermes"
echo "  journalctl -u 9router -f        # Log 9Router"
