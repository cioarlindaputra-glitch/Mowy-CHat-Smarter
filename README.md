# Mowy — CS AI Interior

Chatbot customer service untuk bisnis **interior**. Otak jawaban memakai **OpenAI**,
data disimpan di **PostgreSQL (Render)**, dan tiap percakapan dinilai otomatis dengan
**sistem scoring 13 KPI** sesuai Work Flow CS.

## Fitur
- Chat AI berbahasa Indonesia yang menggali kebutuhan calon klien interior secara natural.
- Lead scoring otomatis 13 kriteria (total 100%), dihitung ulang tiap pesan oleh AI.
- Label suhu lead: **Hot / Warm / Cold**.
- Riwayat percakapan & skor tersimpan per lead di database.
- UI chat dengan panel skor live + API untuk integrasi (mis. WhatsApp nanti).

## Sistem scoring (bobot KPI)
| No | KPI | Bobot | Media |
|---:|-----|------:|-------|
| 1 | Identitas customer (status) | 2,00% | Chat |
| 2 | Alamat Project | 2,00% | Chat |
| 3 | Segment (nilai aset > 1,5 M) | 7,69% | Gmaps |
| 4 | Layout dan Foto Existing | 7,69% | Chat |
| 5 | Estimasi Anggaran | 15,00% | Chat |
| 6 | Pengalaman bikin interior (bukan pertama kali) | 3,00% | Chat |
| 7 | Bersedia membayar CF | 20,00% | Chat |
| 8 | Sudah memahami alur kerja | 5,00% | Video |
| 9 | Detail Interior yang akan dibuat | 10,00% | Chat |
| 10 | Tema / konsep yang diinginkan | 2,00% | Katalog |
| 11 | PIC owner langsung / asisten | 10,00% | Chat |
| 12 | Mau berkunjung ke kantor setelah survey | 10,00% | Chat |
| 13 | Validasi (rekap .pdf dikonfirmasi) | 5,62% | Chat/Telp |
| | **TOTAL** | **100,00%** | |

Tiap kriteria biner: terpenuhi → dapat bobot penuh, tidak → 0. Ubah bobot/aturan di `src/scoring.js`.

## Cara menjalankan (lokal)
1. **Install dependensi**
   ```bash
   npm install
   ```
2. **Siapkan konfigurasi** — salin `.env.example` jadi `.env`, lalu isi:
   - `OPENAI_API_KEY` — dari https://platform.openai.com/api-keys
   - `DATABASE_URL` — dari Render (database Anda → *External Database URL*)
3. **Buat tabel di database**
   ```bash
   npm run init-db
   ```
4. **Jalankan**
   ```bash
   npm start
   ```
   Buka http://localhost:3000

## Deploy ke Render
**Opsi A — Blueprint (otomatis):** push repo ini ke GitHub, lalu di Render pilih
*New → Blueprint* dan arahkan ke repo. File `render.yaml` akan membuat web service +
database. Isi `OPENAI_API_KEY` di dashboard. Setelah live, jalankan `npm run init-db`
sekali (via Render Shell) untuk membuat tabel.

**Opsi B — manual:** buat *PostgreSQL* dan *Web Service* terpisah di Render,
set env var `OPENAI_API_KEY` dan `DATABASE_URL` (pakai *Internal Database URL*),
build `npm install`, start `npm start`.

## Struktur
```
server.js            # Express: API chat + lead
src/openai.js        # Panggilan OpenAI: balasan + evaluasi 13 kriteria
src/scoring.js       # Definisi 13 KPI + perhitungan skor
src/db.js            # Koneksi PostgreSQL
scripts/init-db.js   # Membuat tabel
db/schema.sql        # Skema tabel
public/index.html    # UI chat + panel skor
render.yaml          # Blueprint deploy Render
```

## API ringkas
- `POST /api/chat` — body `{ leadId?, name?, phone?, message }` → `{ leadId, reply, score }`
- `GET /api/leads` — daftar lead + skor
- `GET /api/leads/:id` — detail lead, skor, percakapan
- `GET /api/criteria` — daftar 13 KPI
- `GET /health` — cek status

## Lanjutan (opsional)
- **WhatsApp**: arahkan webhook Starsender/Twilio ke `POST /api/chat` (map nomor → `phone`/`leadId`).
- **Export .pdf rekap** (KPI #13), upload foto/layout (KPI #4), dan halaman dashboard lead bisa ditambahkan di atas API yang sudah ada.
