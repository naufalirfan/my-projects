# QRIS Payment Gateway

Payment Gateway untuk QRIS (QR Code Indonesian Standard) payments, mirip Midtrans tapi khusus QRIS.

## Features

- **Dashboard Merchant** - CRUD merchant, API keys, riwayat transaksi
- **QRIS Generation** - Generate QR code EMV QRIS standard compliant
- **Transaction Processing** - Create, track, simulate payments
- **Webhook/Callback** - Notifikasi status transaksi ke merchant dengan retry
- **Settlement** - Rekonsiliasi dan pencairan dana dengan fee 0.7%
- **API Documentation** - Swagger/OpenAPI

## Integrasi InterActive QRIS

Gateway ini terintegrasi dengan [InterActive QRIS](https://qris.interactive.co.id/) sebagai QRIS Provider (bukan langsung ke bank).

### Cara kerja
1. **Create Transaction** → memanggil `create-invoice` API InterActive → dapat `qris_content` (string QRIS) + `qris_invoiceid`
2. String QRIS di-render jadi QR code di dashboard
3. Customer scan & bayar via e-wallet/mobile banking
4. Status dicek via `checkpaid_qris` API — bisa manual (tombol "Cek Status") atau otomatis via **poller** tiap 1 menit
5. Saat `paid` → transaksi di-update + webhook dikirim ke merchant

### Setup
Tambahkan di `apps/api/.env`:
```env
INTERACTIVE_APIKEY="your_apikey_from_email"
INTERACTIVE_MID="your_mid"
```
APIKEY & mID didapat dari email aktivasi setelah daftar & tanda tangan PKS/NDA di InterActive QRIS.

### Catatan
- Semua transaksi **LIVE** (potong saldo beneran) — tidak ada sandbox
- InterActive **melarang auto-check tiap detik** → poller kami jalan tiap 60 detik (sesuai aturan)
- Expired QRIS: 30 menit
- Minimal nominal: e-wallet Rp100, OVO Rp1000, bank Rp100

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis
- **Docs**: Swagger UI

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Setup env:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

3. Setup database:
```bash
pnpm db:push
pnpm db:generate
```

4. Run:
```bash
pnpm dev
```

- API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs
- Web: http://localhost:3000

## API Usage

### Register Merchant
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'
```

### Create Transaction
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"description":"Test payment"}'
```

### Generate QRIS
```bash
curl -X POST http://localhost:3001/api/qris/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000}'
```

## Production Notes

Untuk production, Anda perlu:

1. **Integrasi Bank/PSP** - Ganti `simulatePayment` dengan integrasi API bank asli
2. **Security** - Set JWT_SECRET, gunakan HTTPS, rate limiting
3. **Monitoring** - Setup logging, alerting
4. **Compliance** - Pastikan izin BI (Bank Indonesia) untuk payment gateway
5. **Background Jobs** - Gunakan Redis/Cron untuk expire transaction & auto settlement

## License

MIT
