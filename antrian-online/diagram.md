# Antrian Online - Vercel App

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Browser)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Ambil Nomor Antrian                         │   │
│  │  2. Lihat Posisi Antrian (Real-time)            │   │
│  │  3. Notifikasi saat giliran tiba                │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 VERCEL (Serverless)                      │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Homepage   │  │  Ambil      │  │  Status     │    │
│  │  (React)    │  │  Nomor      │  │  Antrian    │    │
│  │             │  │  (API)      │  │  (API)      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Realtime Subscription (WebSocket/SSE)          │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (Supabase - Gratis)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Table: antrian                                 │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  id        │ nama    │ status    │ nomor_urut  │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  1         │ Budi    │ menunggu  │ 1           │   │
│  │  2         │ Ani     │ dipanggil │ 2           │   │
│  │  3         │ Cahaya  │ menunggu  │ 3           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Alur Penggunaan

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CUSTOMER   │     │   OWNER      │     │   DATABASE   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  1. Buka App       │                    │
       │───────────────────>│                    │
       │                    │                    │
       │  2. Isi Nama       │                    │
       │───────────────────>│  3. Simpan Antrian │
       │                    │───────────────────>│
       │                    │                    │
       │  4. Dapat Nomor: 5 │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  5. Tunggu...      │                    │
       │                    │                    │
       │                    │  6. Panggil No. 5  │
       │                    │───────────────────>│
       │                    │                    │
       │  7. Notifikasi:    │                    │
       │  "Giliran Anda!"   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

## Contoh UI Sederhana

```
╔═══════════════════════════════════════════════════════╗
║            ANTRIAN ONLINE - KLINIK SEHAT              ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Nomor Anda: #12                                       ║
║  Status: Menunggu                                      ║
║  Posisi: 5 orang di depan Anda                        ║
║                                                       ║
║  ┌───────────────────────────────────────────────┐    ║
║  │  Saat Ini Dipanggil: #7 - Budi               │    ║
║  └───────────────────────────────────────────────┘    ║
║                                                       ║
║  Daftar Antrian:                                      ║
║  ┌─────┬────────────┬────────────┐                    ║
║  │ No  │ Nama       │ Status     │                    ║
║  ├─────┼────────────┼────────────┤                    ║
║  │ 7   │ Budi       │ Dipanggil  │                    ║
║  │ 8   │ Ani        │ Menunggu   │                    ║
║  │ 9   │ Cahaya     │ Menunggu   │                    ║
║  │ 10  │ Dina       │ Menunggu   │                    ║
║  │ 11  •••          │ •••        │                    ║
║  │ 12  │ ANDA       │ Menunggu   │                    ║
║  └─────┴────────────┴────────────┘                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

## Tech Stack

| Komponen       | Teknologi                | Biaya     |
|----------------|--------------------------|-----------|
| Frontend       | Next.js + React          | Gratis    |
| Hosting        | Vercel                   | Gratis    |
| Database       | Supabase (PostgreSQL)    | Gratis    |
| Realtime       | Supabase Realtime        | Gratis    |
| Total          |                          | **$0**    |

## Fitur Utama

1. **Ambil Nomor** - User masukkan nama, dapat nomor urut
2. **Lihat Antrian** - Real-time update posisi
3. **Panggil Antrian** - Admin ubah status, user dapat notifikasi
4. **Histori** - Lihat riwayat antrian selesai
