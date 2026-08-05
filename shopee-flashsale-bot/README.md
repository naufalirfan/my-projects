# Shopee Flash Sale Bot

Bot otomatis checkout flash sale Shopee menggunakan **Python + HTTP API (requests)**.  
Tidak butuh browser/Selenium - langsung panggil API internal Shopee.

## Fitur
- ⚡ **HTTP API based** - Cepat, ringan, tidak butuh browser headless
- 🎯 **Auto-checkout penuh** - Add to cart → Checkout preview → Place order
- ⏰ **Scheduler presisi** - Tunggu jam flash sale (dengan buffer pre-start detik)
- 🔁 **Retry cerdas** - Rate limit configurable, handle stok habis/auth error
- 🔐 **Cookie-based auth** - Pakai cookie `SPC_EC` dari browser (tidak perlu password)
- 📝 **Logging lengkap** - Console + file log dengan timestamp

## Struktur Project

```
shopee-flashsale-bot/
├── config/
│   ├── .env              # Isi data Anda (jangan commit!)
│   └── .env.example      # Template config
├── src/
│   ├── __init__.py
│   ├── config.py         # Load config dari .env
│   ├── api.py            # Shopee API client (auth, cart, checkout, order)
│   ├── bot.py            # Flash sale bot logic (scheduler, retry, checkout flow)
│   └── main.py           # Entry point
├── requirements.txt
└── README.md
```

## Persiapan

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Ambil Cookie SPC_EC dari Browser
1. Buka https://shopee.co.id dan login
2. Tekan `F12` → Tab **Application** (atau Storage)
3. **Cookies** → `https://shopee.co.id` → cari **SPC_EC**
4. Copy value-nya (string panjang)

> **Tip**: Cookie `SPC_EC` biasanya bertahan lama (bulan). Cookie lain seperti `SPC_R_T_ID`, `SPC_U`, `csrftoken` bisa diambil juga tapi opsional - bot bisa generate sendiri dari `SPC_EC`.

### 3. Dapatkan Shop ID & Item ID
Dari URL produk:
```
https://shopee.co.id/nama-produk-i.123456789.987654321
                            ↑shop_id  ↑item_id
```
- `shop_id` = 123456789
- `item_id` = 987654321

### 4. (Opsional) Model ID untuk varian
Jika produk punya varian (warna/ukuran):
1. Buka DevTools → Network → filter "add_to_cart" atau "checkout"
2. Pilih varian di halaman produk
3. Lihat request payload → `model_id`

### 5. Setup Config
```bash
cp config/.env.example config/.env
```

Edit `config/.env`:
```ini
# WAJIB
SHOPEE_SPC_EC=your_spc_ec_cookie_here
SHOP_ID=123456789
ITEM_ID=987654321

# OPSIONAL
MODEL_ID=0                    # 0 = tanpa varian / default
FLASHSLE_TIME=10:00:00       # Jam flash sale WIB
ATTEMPTS_PER_SECOND=5        # Rate limit (safe: 5-10)
MAX_ATTEMPTS=0               # 0 = unlimited
USE_COD=true                 # COD = true, transfer = false
```

## Menjalankan Bot

```bash
# Dari root project
python -m src.main
```

Atau langsung:
```bash
python src/main.py
```

## Konfigurasi Penting

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `SHOPEE_SPC_EC` | - | **Wajib** Cookie SPC_EC dari browser |
| `SHOP_ID` | - | **Wajib** ID toko dari URL produk |
| `ITEM_ID` | - | **Wajib** ID produk dari URL produk |
| `MODEL_ID` | 0 | ID varian (0 = tanpa varian/default) |
| `FLASHSLE_TIME` | 10:00:00 | Jam flash sale (format HH:MM:SS WIB) |
| `PRE_START_SECONDS` | 3 | Mulai request sebelum jam flash sale |
| `ATTEMPTS_PER_SECOND` | 5 | Percobaan checkout per detik |
| `MAX_ATTEMPTS` | 0 | Max total percobaan (0 = unlimited) |
| `USE_COD` | true | true = COD, false = transfer/bank |
| `SHOP_VOUCHER_ID` | - | ID voucher toko (dapat dari API) |
| `VOUCHER_CODE` | - | Kode voucher platform |
| `ADDRESS_ID` | - | ID alamat pengiriman (default = alamat utama) |
| `TIMEZONE` | Asia/Jakarta | Timezone (WIB = Asia/Jakarta) |

## Log Output

```
2026-07-19 09:59:57 | INFO     | 🚀 SHOPEE FLASH SALE BOT STARTED
2026-07-19 09:59:57 | INFO     | Target: shop_id=123456789, item_id=987654321
2026-07-19 09:59:57 | INFO     | Flash sale time: 10:00:00 WIB
2026-07-19 09:59:57 | INFO     | ✅ Login berhasil
2026-07-19 09:59:57 | INFO     | Memeriksa ketersediaan produk...
2026-07-19 09:59:58 | INFO     | Flash sale aktif - Stok: 500, Terjual: 50
2026-07-19 09:59:58 | INFO     | Menunggu 2.5 detik sebelum mulai...
2026-07-19 10:00:00 | INFO     | ⚡ WAKTU FLASH SALE DIMULAI! Mulai mencoba checkout...
2026-07-19 10:00:00 | DEBUG    | Attempt #1: Add to cart...
2026-07-19 10:00:00 | DEBUG    | Attempt #1: Checkout preview...
2026-07-19 10:00:00 | DEBUG    | Attempt #1: Place order...
2026-07-19 10:00:00 | INFO     | ✅ BERHASIL! Order SN: 260719XXXXX (percobaan #1, 0.45s)
```

## Troubleshooting

### ❌ "SHOPEE_SPC_EC cookie wajib diisi!"
Cookie belum di-set di `.env`. Ambil dari browser DevTools > Application > Cookies > SPC_EC.

### ❌ "Login gagal! Cek cookie SPC_EC"
Cookie `SPC_EC` kadaluarsa (biasanya 30 hari). Login ulang di browser dan copy cookie baru.

### ❌ "Add to cart failed: item not found"
- Shop ID / Item ID salah
- Produk sudah tidak dijual / dihapus
- Model ID tidak cocok dengan varian yang dipilih

### ❌ "Stok habis" / "Sold out"
Flash sale kehabisan stok. Bot akan berhenti otomatis.

### ❌ "Auth error" / "403 Forbidden"
- Cookie `csrftoken` tidak match - bot akan auto-refresh
- IP kena rate limit - kurangi `ATTEMPTS_PER_SECOND` (misal 3)
- Gunakan proxy di config (`HTTP_PROXY`, `HTTPS_PROXY`)

### ⏱️ Terlalu lambat / kalah cepat
- Kurangi `PRE_START_SECONDS` jadi 1-2
- Naikkan `ATTEMPTS_PER_SECOND` ke 8-10 (risiko rate limit naik)
- Gunakan VPS/cloud server dekat server Shopee (SG/ID)

## Keamanan & Etika

⚠️ **PENTING:**
- **JANGAN** share file `config/.env` ke siapapun (berisi cookie login)
- **JANGAN** commit `.env` ke git (sudah di `.gitignore` idealnya)
- Gunakan untuk **kebutuhan pribadi** saja, bukan reseller bot massal
- Shopee bisa banned akun yang terlalu agresif (rate limit tinggi)
- Bot ini **tidak menjamin 100% sukses** - tergantung jaringan, stok, kecepatan server

## Disclaimer

Bot ini untuk **tujuan edukasi & personal use**. Penggunaan berlebihan melanggar ToS Shopee dan berisiko akun dibanned. Gunakan dengan bijak.

## Lisensi

MIT License - Bebas digunakan & dimodifikasi.