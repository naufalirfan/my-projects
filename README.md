# Default Project

Kumpulan proyek-proyek yang berisi bot, tools, dan aplikasi untuk berbagai keperluan.

## Daftar Proyek

| Nama Proyek | Deskripsi | Tech Stack |
|-------------|-----------|------------|
| **forex-bot** | Bot analisis forex dengan fitur BBEMA, MA, dan berita | Node.js, Telegram Bot |
| **forex-bot-deploy** | Versi deploy forex-bot | Node.js |
| **telegram-ai-bot** | Bot Telegram dengan integrasi AI | Node.js, Telegram Bot |
| **ai-router** | Router untuk AI requests | Python |
| **shopee-flashsale-bot** | Bot untuk flash sale Shopee | Python |
| **qris-gateway** | Gateway pembayaran QRIS | Node.js, TypeScript |
| **antrian-online** | Sistem antrian online | - |
| **free-tool-finder** | Tool pencari free tools | - |
| **interview-prep** | Persiapan interview | - |
| **jurnal_LBP** | Jurnal LBP | - |
| **learning-path** | Jalur pembelajaran | - |

## Setup

### Prerequisites

- Node.js (untuk proyek JS/TS)
- Python (untuk proyek Python)
- Telegram Bot Token (untuk bot Telegram)

### Instalasi

```bash
# Clone repository
git clone https://github.com/USERNAME/DEFAULT_PROJECT.git
cd DEFAULT_PROJECT

# Pilih proyek yang ingin dijalankan
cd forex-bot
npm install
```

### Konfigurasi

1. Copy `.env.example` ke `.env`
2. Isi variabel lingkungan yang diperlukan

```bash
# Contoh untuk forex-bot
cd forex-bot
cp .env.example .env
# Edit .env dengan values yang benar
```

## Menjalankan

### Forex Bot

```bash
cd forex-bot

npm start              # Console
npm run telegram       # Kirim ke Telegram
npm run bbema          # Console BBEMA V2.0
npm run schedule       # Auto 08:00 WIB
```

### Shopee Flashsale Bot

```bash
cd shopee-flashsale-bot
python src/main.py
```

## Struktur Folder

```
Default Project/
├── .gitignore
├── README.md
├── forex-bot/
├── forex-bot-deploy/
├── telegram-ai-bot/
├── ai-router/
├── shopee-flashsale-bot/
├── qris-gateway/
├── antrian-online/
├── free-tool-finder/
├── interview-prep/
├── jurnal_LBP/
├── learning-path/
└── migrsi server/
```

## Catatan Penting

- **Jangan commit file `.env`** - Berisi API keys dan secrets
- **Gunakan `.env.example`** sebagai template
- Semua `node_modules/` sudah di-ignore

## License

Private - Untuk penggunaan pribadi
