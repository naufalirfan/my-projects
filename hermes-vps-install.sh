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
echo "   HERMES AGENT VPS AUTO-INSTALLER"
echo "============================================"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Jalankan script ini sebagai root!${NC}"
  echo "Cara pakai: sudo bash hermes-vps-install.sh"
  exit 1
fi

# 1. Update & Install Base Deps
echo -e "${YELLOW}[1/6] Updating system & installing dependencies...${NC}"
apt update && apt upgrade -y
apt install -y curl git ufw xz-utils

# 2. Create User
echo -e "${YELLOW}[2/6] Creating hermes user...${NC}"
if ! id "hermes" &>/dev/null; then
  adduser --disabled-password --gecos "" hermes
  usermod -aG sudo hermes
else
  echo "User hermes already exists."
fi

# 3. Install Docker (Optional but recommended)
echo -e "${YELLOW}[3/6] Installing Docker (Recommended)...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker hermes
  echo -e "${GREEN}Docker installed!${NC}"
else
  echo "Docker already installed."
fi

# 4. Firewall
echo -e "${YELLOW}[4/6] Configuring UFW Firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
echo "y" | ufw enable

# 5. Install Hermes Agent
echo -e "${YELLOW}[5/6] Installing Hermes Agent (Native)...${NC}"
# Install hermes as the hermes user using the official script
# --skip-browser: Skip playwright (not needed for pure API agent)
# --skip-setup: We'll let the user do setup interactively after
su - hermes -c 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-browser --skip-setup'

# 6. Interactive Configuration
echo -e "${YELLOW}[6/6] Running Hermes Setup Wizard...${NC}"
echo ""
echo -e "${GREEN}Sekarang kita akan konfigurasi Hermes Agent kamu.${NC}"
echo "Kamu akan memilih provider LLM (misal OpenRouter) dan model."
echo ""
echo -e "Panduan singkat:"
echo -e "  1. Pilih provider (OpenRouter recommended)"
echo -e "  2. Masukkan API Key"
echo -e "  3. Pilih model (minimal 64k context window)"
echo -e "  4. Set 'Terminal backend' -> 'Local'"
echo -e "  5. Pilih 'Set up messaging now' untuk Telegram/Discord"
echo ""
echo -e "${BLUE}Tekan ENTER untuk memulai Setup Wizard...${NC}"
read

# Launch interactive setup as hermes user
su - hermes -c 'hermes setup'

echo ""
echo -e "${YELLOW}Apakah kamu sudah selesai setup Gateway (Telegram/Discord)? (y/n)${NC}"
read -p "> " SETUP_DONE

if [ "$SETUP_DONE" = "y" ]; then
  echo -e "${YELLOW}Installing Gateway as System Service...${NC}"
  
  # Create systemd service manually for reliability
  cat > /etc/systemd/system/hermes-gateway.service <<EOF
[Unit]
Description=Hermes Agent Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=hermes
Group=hermes
WorkingDirectory=/home/hermes
ExecStart=/home/hermes/.local/bin/hermes gateway
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable hermes-gateway
  systemctl start hermes-gateway
  
  echo -e "${GREEN}Gateway Service installed and started!${NC}"
  echo -e "Status: $(systemctl status hermes-gateway --no-pager | grep Active:)"
else
  echo -e "${YELLOW}Skipping gateway service setup.${NC}"
  echo "Kamu bisa menjalankan 'hermes gateway' atau setup service nanti."
fi

echo ""
echo -e "${GREEN}============================================"
echo -e "      INSTALASI SELESAI!"
echo -e "============================================${NC}"
echo "Coba kirim pesan 'hello' ke bot Telegrammu!"
echo ""
echo "Useful commands:"
echo "  hermes doctor             # Check health"
echo "  hermes setup              # Reconfigure"
echo "  hermes model              # Change model"
echo "  systemctl restart hermes-gateway"
