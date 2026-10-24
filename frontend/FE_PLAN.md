# Rencana UI jitu.fi — Pembagian Tugas

Untuk: **Farhan, Jeki, Mario**. Ditulis 2026-10-23 dari kondisi repo saat ini.

**Fokus tahap ini: UI dulu.** Semua layar dibuat lengkap secara visual, termasuk animasi dan semua state-nya, memakai **data dummy statis**. Belum ada koneksi wallet, belum ada API/WebSocket, dan belum ada kontrak. Integrasi ke data asli dikerjakan nanti (lihat bagian 6).

Rujukan:
- Gaya visual: [`DESIGN.md`](DESIGN.md) dan skill `frontend-design`.
- Aturan game (untuk isi layar): [`DECISIONS.md`](../DECISIONS.md).
- Isi tiap layar: spec `frontend-app-shell`, `frontend-vault-ui` dan `frontend-game-ui` di `openspec/changes/build-crypto-draft-mvp/specs/`.

---

## 1. Kondisi sekarang

**Sudah jadi** (di `/`):
- Landing dengan judul 3D "Arena Jitu": kristal Monad, 4 podium, koin, dan intro crest 3D (`src/components/world/`).
- Section quest cards, loot bar yield, demo season, dan rules.
- Popup tutorial How to play (`src/components/howto/`).
- `GameButton`, palet crest, font Bree Serif + Nunito, dan data 3 house bot (`src/lib/bots.ts`).

**Belum ada:** layout bersama (nav dan banner masih langsung di `page.tsx`), UI kit, dan semua halaman selain `/`.

---

## 2. Cara kerja UI-first

- **Data dummy** ditaruh di `src/mocks/`, satu file per area: `season.ts`, `position.ts`, `table.ts`, `leaderboard.ts`, `profile.ts`. Bentuk datanya meniru apa yang nanti dikirim backend, jadi saat integrasi komponen tidak perlu diubah.
- **Semua state harus bisa dilihat.** Tiap halaman punya pengalih state khusus dev, misalnya `?state=enrollment-closed` atau panel kecil di pojok. Dengan begitu layar kosong, loading, error, dan kasus khusus bisa dicek tanpa backend.
- **Komponen menerima data lewat props**, tidak mengambil data sendiri. Halaman yang mengambil dari `src/mocks/` untuk sekarang.
- **Tombol aksi** (deposit, klaim, lock picks, pakai skill) cukup memicu state berikutnya di UI: pending lalu sukses. Tidak ada transaksi asli.
- **Tombol Connect wallet** hanya tampilan (dummy alamat `0x12…ab`).

---

## 3. Semua layar dan komponen yang dibutuhkan

### A. Kerangka dan UI kit (dipakai semua orang, dikerjakan paling dulu)
1. Layout bersama:
   - banner "Testnet · simulation" di semua halaman
   - nav (logo crest, link halaman, tombol Connect dummy)
   - footer
   - mobile-first: 375 px tanpa scroll horizontal
2. Layar "wrong network": overlay ajakan ganti ke Monad testnet (tampilan saja).
3. UI kit: Panel/Board, Modal, Toast, Countdown (detik), AmountInput, StatBadge, Tabs, Skeleton, EmptyState, CoinCard.
4. Util tampilan angka: en-US (`1,234.5 mUSD`), bps → persen, dan format countdown.

### B. Layar vault
5. **Landing (sisa):** kartu status musim dengan countdown dari data dummy, dan CTA dengan dua varian ("Deposit" untuk yang belum punya posisi, "Play" untuk yang sudah).
6. **`/deposit`:**
   - Kartu faucet (siap / sedang cooldown dengan sisa waktu).
   - Pilihan tenor "1 week" / "1 month" (dengan lama demo 15/30 menit, countdown enrollment, dan besar pot bonus).
   - Input jumlah (minimal 10 mUSD, saldo tidak cukup).
   - Catatan "pokok aman, dibayar saat jatuh tempo" dan cap bobot 1.000 mUSD.
   - Tombol deposit dengan state pending dan sukses.
   - State: enrollment tutup, dan sudah punya posisi di tenor lain.
7. **Kartu posisi dan estimasi pendapatan:** pokok + yield dasar + estimasi bonus, waktu menuju jatuh tempo, dan label "simulated".
8. **`/claim`:** rincian pokok / yield dasar / bonus / total, tombol klaim, layar konfirmasi, state shortfall, dan state "belum jatuh tempo".

### C. Layar game
9. **`/play`:** 4 kartu preset (Quick 3, Standard 5, Long 7, Marathon 10) dengan maks token per ronde dan perkiraan durasi, "game terhitung n/K", dan tombol Play. State: musim hampir habis, dan masih ada meja berjalan.
10. **Header meja:** Round n/total, fase, countdown detik, "Pick up to N", dan "Live 87s".
11. **Papan 8 koin:** CoinCard dengan logo, simbol, harga, dan sparkline dummy.
12. **Fase Commit:**
    - Pilih 1 sampai maks token, dengan toggle Buy/Sell per koin.
    - Tolak pilihan yang melebihi maks token.
    - Label "confidence play" kalau pilih lebih sedikit dari maks.
    - Slot BOOST / INSURANCE untuk satu pick.
    - Tombol "Lock picks" dengan state pending.
13. **Fase Reveal:** animasi membuka pick 4 pemain (termasuk BOOST/INSURANCE), dan peringatan forfeit.
14. **Panel 4 pemain:** avatar (kamu + Bruno, Bera, Dex), skor live, pick dengan return-nya, penanda void, dan status forfeit.
15. **Hasil ronde:** skor semua pemain, pemenang (bisa seri), dan toast "dapat skill".
16. **Akhir game:** podium skor game, poin musim yang masuk (atau "di luar K game pertama" / "lewat batas musim"), dan tombol Play again.

### D. Visual game, skill, dan statistik
17. **Scene meja 3D "coin spirits"** (lihat DECISIONS, "Visual direction"):
    - Koin yang dipilih muncul sebagai spirit di podium pemain.
    - Spirit naik atau turun mengikuti return.
    - Di belakangnya ada ridge chart: garis harga yang digambar sebagai punggung gunung.
    - Pakai ulang `src/components/world/`, dengan fallback 2D tanpa WebGL atau saat reduced motion.
18. **Chart harga** untuk koin terpilih dan sparkline mini, digerakkan oleh harga dummy random walk.
19. **Tangan skill:** maksimal 3 kartu dengan picker yang sesuai:
    - LOCK / FLIP: pilih pick sendiri.
    - SWAP: pilih pick sendiri, lalu koin baru dan arahnya.
    - FREEZE: pilih pick lawan.
    - Ada state nonaktif (lewat deadline, sudah pakai skill ronde ini, pick sudah kena efek).
20. **Animasi 6 skill:**
    - FREEZE: es.
    - FLIP: berputar terbalik.
    - SWAP: bertukar.
    - INSURANCE: perisai cahaya.
    - BOOST: membesar.
    - LOCK: segel gembok.
    - Termasuk saat bot mem-FREEZE kamu.
21. **`/leaderboard`:** tab per tenor, kolom poin, n/K, bobot, dan estimasi bonus. Baris milikmu di-highlight. Ada empty state.
22. **`/profile`:** daftar riwayat game, detail skor per ronde, dan skill yang dipakai. Ada empty state.

---

## 4. Pembagian tugas

Setiap orang memegang folder sendiri supaya jarang bentrok. File milik orang lain boleh diubah, tapi beri tahu pemiliknya dulu.

### 👤 Farhan — Kerangka, UI kit, layar vault
Nomor 1–8.

| Milik Farhan | Isi |
|---|---|
| `src/app/layout.tsx`, `src/components/shell/` | Banner, nav, footer, overlay wrong network |
| `src/components/ui/` | UI kit (sudah ada `GameButton`) |
| `src/lib/format.ts` | Util tampilan angka |
| `src/app/page.tsx` | Sisa landing |
| `src/app/deposit/`, `src/app/claim/`, `src/components/vault/` | Deposit, faucet, posisi, klaim |
| `src/mocks/season.ts`, `position.ts` | Data dummy vault |
| `package.json` | Satu-satunya yang menambah dependensi; yang lain minta lewat Farhan |

Selesai kalau: semua halaman memakai layout yang sama, UI kit dipakai Jeki dan Mario, dan `/deposit` serta `/claim` lengkap dengan semua state-nya.

### 👤 Jeki — Layar game (alur meja)
Nomor 9–16.

| Milik Jeki | Isi |
|---|---|
| `src/app/play/` | Pilih preset |
| `src/app/table/[id]/page.tsx` | Halaman meja yang merangkai semua bagian |
| `src/components/table/` | Header, papan koin, panel commit, reveal, panel pemain, hasil ronde, podium akhir |
| `src/mocks/table.ts` | Data dummy meja: 1 kamu + 3 bot, koin, pick, skor per fase |

Ditambah **demo alur palsu** di sisi klien: timer yang memutar fase Commit 20 detik → Reveal 10 detik → Live → Hasil → ronde berikutnya. Dengan ini satu game terasa utuh, dan pengalih state dev tetap ada untuk lompat ke fase tertentu.

Selesai kalau: satu game Quick bisa "dimainkan" dari `/play` sampai podium akhir dengan data dummy, dan setiap fase serta state khususnya (forfeit, seri, lewat batas musim) bisa ditampilkan.

### 👤 Mario — Visual 3D, skill, statistik
Nomor 17–22.

| Milik Mario | Isi |
|---|---|
| `src/components/table-scene/` | Scene coin spirits, ridge chart, fallback 2D |
| `src/components/world/` | Pemilik komponen 3D yang sudah ada |
| `src/components/skills/` | Kartu skill, picker target, animasi 6 skill |
| `src/components/chart/` | Chart harga, sparkline, harga dummy random walk |
| `src/app/leaderboard/`, `src/app/profile/` | Leaderboard dan profil |
| `src/mocks/leaderboard.ts`, `profile.ts` | Data dummy statistik |

Selesai kalau: spirit bergerak mengikuti harga dummy, keenam skill bisa dipilih dan dianimasikan, fallback 2D jalan tanpa WebGL, dan leaderboard serta profil lengkap dengan empty state.

### Titik sambung (sepakati di hari pertama)
- **Farhan → semua:** UI kit, layout, dan `format.ts`. Sambil menunggu, Jeki dan Mario boleh mulai dengan elemen sementara, lalu menggantinya dengan UI kit.
- **Jeki ↔ Mario:** bentuk data meja di `src/mocks/table.ts` (pemain, pick, harga, skill). Mario membuat `<TableScene>`, `<SkillHand>` dan `<PriceChart>` yang menerima data itu lewat props, lalu Jeki memasangnya di halaman meja.

---

## 5. Urutan kerja

| Tahap | Farhan | Jeki | Mario |
|---|---|---|---|
| **1** | Layout + banner + nav, UI kit inti, `format.ts` | Bentuk data `mocks/table.ts`, `/play`, header meja, papan koin | Prototipe scene coin spirits, chart + harga dummy |
| **2** | `/deposit` dengan semua state, kartu posisi | Commit, Reveal, panel pemain | Tangan skill + picker, animasi 6 skill |
| **3** | `/claim`, sisa landing, overlay wrong network | Hasil ronde, podium akhir, demo alur palsu | `/leaderboard`, `/profile`, fallback 2D |
| **4** | Cek semua halaman di 375 px dan reduced motion, rapikan konsistensi | | |

---

## 6. Nanti, setelah UI selesai (bukan tahap ini)
Dikerjakan setelah backend dan kontrak siap. Rinciannya ada di task 5.1–5.9 `tasks.md`:
- Koneksi wallet (wagmi, viem, RainbowKit) untuk chain 10143 / 31337, dan gating chain salah.
- Klien REST + WebSocket yang menggantikan `src/mocks/`.
- Rumus skor dari `packages/shared` untuk skor live.
- Tanda tangan EIP-712, relayer, penyimpanan salt, dan auto-reveal asli.
- Deposit permit / approve, faucet, dan klaim lewat kontrak.
- Counter tx on-chain dan link explorer.

---

## 7. Aturan kerja bersama
- **Bahasa UI:** Inggris, angka en-US. Pakai "Buy/Sell", bukan "Up/Down".
- **Branch** per fitur `feat/frontend-<nama>`, lalu merge ke `main`. Format commit `feat(frontend): ...`, **tanpa** trailer Co-Authored-By AI.
- **Sebelum merge:** `pnpm --filter frontend build` dan `lint` hijau, dicek di 375 px dan dengan reduced motion.
- **Next.js 16 berbeda dari versi lama.** Baca `node_modules/next/dist/docs/` sebelum memakai API Next (lihat `AGENTS.md`).
- **Keputusan desain baru** dicatat di `DECISIONS.md`.
