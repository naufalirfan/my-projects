# Ringkasan Skema Tarif & Kebijakan Nutaraline Gateway (Update November 2026)

Dokumen ini merangkum hasil verifikasi langsung terhadap endpoint API (`/v1/models`, `/api/web/config`), dokumentasi resmi (`https://nutaraline.co.uk/docs`), serta pengujian live terhadap API key.

---

## 1. Status Free Tier (Apakah Masih Ada Kuota Gratis?)

**YA, MASIH ADA.**
* Setiap API key yang valid tetap mendapatkan **Free Daily Allowance** sebesar **3.000.000 token per hari**.
* Kuota gratis harian ini reset otomatis setiap pukul **00.00 WIB**.
* **Model yang termasuk dalam kuota gratis (Stable Pool):**
  * `nemotron-3-ultra`
  * `nemotron-3.5-lightning`
  * `north-mini-code`
  * `dots-3-note-preview`
  * *(dan model Stable Pool lainnya)*
* Pemanggilan ke model Stable Pool dalam batas 3M token/hari dikenakan biaya **Rp 0** (tanpa potongan saldo dan tanpa biaya request).

---

## 2. Kebijakan Dedicated LoRA Pool

Model-model baru di Dedicated LoRA:
* `glm-5.3-flash`
* `gpt-6-luna`
* `minimax-m3.1-flash`
* `deepseek-v4.1-flash-1017`
* `qwen3.8-flash-next`
* `claude-haiku-5-5`
* `muse-ember-1.0`

### Apakah Dedicated LoRA Masuk Kuota Gratis?
**TIDAK.**
* Berdasarkan metadata sistem `/v1/models`:
  * `billing_policy: "prepaid_only"`
  * `free_daily_policy.applies: false`
  * `unlimited_policy.covered: false`
* Model-model ini **wajib menggunakan saldo dompet prabayar (prepaid wallet)**.

---

## 3. Skema Biaya (Per Request + Per Token)

Mulai update November 2026, admin menerapkan biaya mikro anti-spam:

1. **Biaya per Request Tetap**: **Rp 0,5** per request (`500.000 micros IDR`).
2. **Biaya Token (Pro-Rata)**: Dihitung proporsional per token berdasarkan tarif per 1.000.000 token (rata-rata Rp 69 – Rp 89 / 1M token).

### Simulasi Hitungan 1 Request:
Misalnya menggunakan model `claude-haiku-5-5` (Tarif: Input Rp 74 / 1M, Output Rp 148 / 1M) dengan 1.000 token prompt dan 500 token completion:
* Biaya request: **Rp 0,50**
* Biaya input: `(1.000 / 1.000.000) * Rp 74` = **Rp 0,074**
* Biaya output: `(500 / 1.000.000) * Rp 148` = **Rp 0,074**
* **Total 1 Request:** $\approx$ **Rp 0,65** *(sekitar 65 perak)*.

---

## 4. Paket Langganan Unlimited (Rp 20.000 / 10 Hari)

Jika berlangganan paket Unlimited:
* **Stable Pool & Flex Pool**: **TETAP UNLIMITED (Rp 0)** tanpa biaya request Rp 0,5 dan tanpa biaya token.
  * **FUP (Fair Usage Policy)**:
    * Batas request: 30 request/menit (burst 8).
    * Maksimal **4.500 request per hari**.
    * Maksimal **1.000.000.000 (1 Miliar) token per hari**.
    * Reset harian pukul 00.00 WIB.
* **Dedicated LoRA Pool & Media (Gambar/Video)**:
  * **Tetap berbayar (Prepaid-only)**, memotong saldo dompet.
  * **Benefit Unlimited**: Mendapatkan **diskon 25%** untuk tarif token model LoRA.

---

## 5. Ringkasan Matriks

| Kategori | Stable Pool | Flex Pool (PAYG) | Flex Pool (Unlimited) | Dedicated LoRA |
| :--- | :---: | :---: | :---: | :---: |
| **Biaya Request** | Rp 0 (Gratis) | Rp 0,5 / req | Rp 0 (Covered) | Rp 0,5 / req |
| **Biaya Token** | Rp 0 (Free Allowance) | Rp 30 – 60 / 1M | Rp 0 (Covered) | Rp 69 – 89 / 1M |
| **Kebutuhan Saldo** | Tanpa Saldo | Butuh Saldo | Paket Aktif | Wajib Saldo |
| **Batas Gratis** | 3 Juta token/hari | Tidak ada | Sesuai FUP | Tidak ada |

---

*Disusun & diverifikasi pada 19 November 2026.*
