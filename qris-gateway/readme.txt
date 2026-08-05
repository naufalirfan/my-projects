Saat mau production
Isi INTERACTIVE_APIKEY + INTERACTIVE_MID di apps/api/.env
Ganti DATABASE_URL ke PostgreSQL
pnpm db:push (pakai schema.postgres) + jalanin Redis
pnpm dev (bukan dev:sqlite)


Kalau perlu bantuan lagi (integrasi API key asli, deploy, atau fitur tambahan) tinggal bilang. Selamat mencoba! 🚀

jalanin
cd qris-gateway
pnpm dev:sqlite