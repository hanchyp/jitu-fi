# Rencana Frontend jitu.fi — Pembagian Tugas

Untuk: **Farhan, Jeki, Mario**. Ditulis 2026-10-23 dari kondisi repo saat ini.

Sumber kebenaran (baca dulu sebelum mulai):
- Aturan game dan tokenomics: [`DECISIONS.md`](../DECISIONS.md). Ini mengalahkan `CRYPTO_DRAFT_BUILD_SPEC.md`.
- Spec frontend: `openspec/changes/build-crypto-draft-mvp/specs/frontend-app-shell`, `frontend-vault-ui`, `frontend-game-ui`.
- Spec yang dipakai FE: `shared-scoring` (rumus skor) dan `backend-data-api` (REST + WebSocket).
- Gaya visual: [`DESIGN.md`](DESIGN.md) dan skill `frontend-design`.
- Task resmi: `openspec/changes/build-crypto-draft-mvp/tasks.md`, bagian 5.1–5.9.

---

## 1. Kondisi sekarang

**Sudah jadi** (semuanya di `/`):
- Landing page dengan judul 3D "Arena Jitu": kristal Monad, 4 podium, koin, intro crest 3D, toon outline, dan fallback tanpa WebGL. Ada di `src/components/world/`.
- Section quest cards, loot bar yield, demo season, dan rules, dengan copy yang sudah mengikuti aturan baru.
- Popup tutorial How to play dengan 6 langkah animasi (`src/components/howto/`).
- `GameButton`, palet dari logo crest, font Bree Serif + Nunito, dan data 3 house bot (`src/lib/bots.ts`).

**Belum ada sama sekali:**
- Koneksi wallet (wagmi, viem, RainbowKit), TanStack Query, Zustand, chart.
- Layout bersama untuk semua halaman. Nav dan banner testnet masih ditulis langsung di `page.tsx`.
- Halaman `/deposit`, `/play`, `/table/[id]`, `/leaderboard`, `/claim`, `/profile`.
- Klien API dan WebSocket, serta setup test (vitest + testing-library).

**Belum ada di luar FE** (ini memengaruhi cara kerja kita):
- Backend, kontrak, dan `packages/shared` (konstanta, rumus skor, ABI, alamat) **belum dibuat**.
- Karena itu FE dikerjakan **mock-first**: semua data lewat satu lapisan `src/lib/api/`, yang untuk sekarang memakai mock. Saat backend dan kontrak siap, cukup lapisan itu yang diganti.

---

## 2. Semua yang dibutuhkan FE

### A. Fondasi (memblokir yang lain, dikerjakan paling dulu)
1. Install semua dependensi dalam satu kali (supaya `pnpm-lock.yaml` tidak bentrok): `wagmi`, `viem` (≥ 2.40), `@rainbow-me/rainbowkit`, `@tanstack/react-query`, `zustand`, `lightweight-charts`, dan untuk test `vitest` + `@testing-library/react`.
2. Providers: wagmi dengan chain **10143** (Monad testnet) dan **31337** (anvil) saja, ditambah RainbowKit dan QueryClient.
3. Gating chain salah: kalau wallet ada di chain lain (misalnya mainnet 143), tampilkan prompt ganti network dan nonaktifkan semua aksi.
4. Layout bersama:
   - banner "Testnet · simulation" di **semua** halaman
   - nav (logo crest, link, tombol Connect)
   - footer
   - mobile-first: harus bisa dipakai di lebar 375 px tanpa scroll horizontal
5. UI kit: Panel/Board, Modal, Toast, Countdown (dalam detik), AmountInput, StatBadge, Tabs, Skeleton, CoinCard. Semuanya mengikuti `DESIGN.md`: outline 3 px, bevel, tanpa glassmorphism.
6. Util angka en-US (`1,234.5 mUSD`), bps → persen, dan mUSD 6 desimal sebagai `bigint`. **Tidak boleh float untuk uang.**
7. Lapisan data `src/lib/api/`: tipe data, klien REST, klien WS (room `table:<id>` dan `prices`), dan **mock** yang meniru API sesuai spec `backend-data-api`.

### B. Vault: deposit, posisi, klaim
8. **Landing (sisa 5.2):** status musim live dengan countdown dari API. CTA "Play now" mengarah ke `/deposit` kalau belum punya posisi, atau ke `/play` kalau sudah. Ditambah test CTA.
9. **`/deposit` (5.3):**
   - Faucet 1.000 mUSD dengan sisa waktu cooldown 1 jam.
   - Pilihan tenor "1 week" / "1 month", lengkap dengan lama demo (15 / 30 menit), countdown enrollment, dan besar pot bonus (termasuk dana sponsor).
   - Input jumlah: minimal 10 mUSD dan tidak melebihi saldo.
   - Catatan: pokok, yield dasar, dan bonus semuanya dibayar saat jatuh tempo, dan kalah terus tetap dapat pokok + yield dasar. Tampilkan juga cap bobot 1.000 mUSD.
   - Deposit lewat permit, dengan fallback approve + deposit.
   - State: enrollment sudah tutup, atau sudah punya posisi di tenor lain (1 posisi aktif per alamat).
10. **Estimasi pendapatan:** pokok + yield dasar + estimasi bonus dari `previewClaim`, refresh setelah setiap game selesai, ditambah waktu menuju jatuh tempo.
11. **`/claim` (5.9):** rincian pokok, yield dasar, bonus, dan total, plus tombol klaim, layar konfirmasi, dan pesan untuk kasus shortfall (pokok dibayar pro-rata).

### C. Alur game (logika)
12. **`/play` (5.4):** pilih preset Quick 3 / Standard 5 / Long 7 / Marathon 10, dengan jumlah ronde, maks token per ronde, dan perkiraan durasi. Tampilkan juga "game terhitung n/K". Tombol Play → `/table/<id>`. Ada state untuk "musim hampir habis" dan "masih ada meja berjalan".
13. **Store meja** `useTable(id)`: menggabungkan state dari API dan event WS menjadi satu sumber untuk seluruh layar meja (fase, deadline, ronde, koin, pick, skor, skill).
14. **Mock game engine:** mensimulasikan satu meja penuh (1 kamu + 3 bot) dengan timer fase 20/10/60–120 detik, harga random walk, dan bot yang memilih koin acak. Ini wajib ada supaya meja bisa dikerjakan tanpa backend.
15. **Rumus skor di sisi FE**, sesuai spec `shared-scoring`: return bps, void < 1 bps, `cap × rata-rata berbobot`, efek 6 skill, dan skor game `Σ ÷ Σ cap`. Kalau `packages/shared` belum ada, tulis langsung di `packages/shared/src/scoring.ts` mengikuti spec (task 2.5/2.6), supaya nanti tidak perlu dipindah.
16. **Header meja:** "Round n/total", fase, countdown detik, "Pick up to N", dan "Live 87s".
17. **Fase Commit (5.5):**
    - Papan 8 koin.
    - Pilih 1 sampai maks token, dengan toggle Buy/Sell per koin.
    - Opsional BOOST atau INSURANCE pada satu pick.
    - Pilih lebih sedikit dari maks diberi label "confidence play".
    - Salt acak disimpan di `localStorage` (key `table:round:address`) **sebelum** tanda tangan.
    - Tanda tangan EIP-712 lalu kirim ke relayer, dengan status pending.
18. **Fase Reveal (5.6):**
    - Auto-reveal tanpa klik, dan tetap jalan setelah reload.
    - Kalau salt hilang, tampilkan peringatan forfeit.
    - Animasi buka pick semua pemain, beserta BOOST/INSURANCE.
19. **Panel 4 pemain:** skor live dihitung dari tick harga dengan rumus yang sama, ditambah penanda void dan status forfeit.
20. **Hasil (5.8):**
    - Per ronde: skor semua pemain, pemenang (bisa lebih dari satu kalau seri), dan toast "dapat skill".
    - Akhir game: podium skor game, poin musim yang masuk (atau keterangan "di luar K game pertama" / "lewat batas musim"), dan tombol "Play again".

### D. Visual game, skill, dan statistik
21. **Scene meja 3D "coin spirits"** (lihat DECISIONS, "Visual direction"):
    - Koin yang dipilih muncul sebagai spirit di podium pemain.
    - Saat Live, spirit naik atau turun mengikuti return.
    - Di belakangnya ada chart "ridge" berupa garis harga yang digambar sebagai punggung gunung.
    - Pakai ulang komponen `src/components/world/`, dan sediakan fallback 2D tanpa WebGL atau saat reduced motion.
22. **Chart harga** (lightweight-charts) untuk koin yang dipilih, plus sparkline mini di CoinCard.
23. **Tangan skill (5.7):** kartu skill (maks 3) dengan picker yang sesuai:
    - LOCK / FLIP: pilih pick sendiri.
    - SWAP: pilih pick sendiri, lalu koin baru dan arahnya.
    - FREEZE: pilih pick lawan.
    - Nonaktif setelah deadline live, kalau sudah pakai skill ronde ini, atau kalau pick sudah kena efek.
24. **Animasi efek skill:**
    - FREEZE: spirit membeku es.
    - FLIP: spirit berputar terbalik.
    - SWAP: spirit bertukar.
    - INSURANCE: perisai cahaya di bawah spirit.
    - BOOST: spirit membesar.
    - LOCK: segel gembok.
    - Termasuk animasi saat bot mem-FREEZE kamu.
25. **`/leaderboard` (5.9):** hanya pemain manusia, kolom poin, n/K, bobot, dan estimasi bonus. Baris milikmu di-highlight. Ada tab per tenor.
26. **`/profile` (5.9):** riwayat game, skor per ronde, dan skill yang dipakai.

### E. Penutup (semua orang)
27. Ganti mock ke backend dan kontrak asli begitu tersedia (alamat dan ABI dari `packages/shared/src/deployments/<chainId>.json`).
28. Polish untuk demo: counter tx on-chain dan link explorer di layar meja (task 7.2), dan jalur demo 3 menit dari README.
29. Cek akhir: 375 px, reduced motion, label "simulated" pada angka yield, dan banner terlihat di semua layar.

---

## 3. Pembagian tugas

Prinsipnya: **setiap orang memegang folder sendiri**, supaya jarang bentrok saat merge. File milik orang lain boleh diubah, tapi beri tahu pemiliknya dulu.

### 👤 Farhan — Fondasi + Vault
Nomor 1–11, ditambah setup test.

| Folder / file milik Farhan | Isi |
|---|---|
| `src/app/layout.tsx`, `src/app/providers.tsx` | Providers, layout bersama |
| `src/components/shell/` | Banner, nav, footer, gating network |
| `src/components/ui/` | UI kit (sudah ada `GameButton`) |
| `src/lib/web3/`, `src/lib/format.ts` | Config wagmi/chain, util angka |
| `src/lib/api/` | Tipe, klien REST/WS, mock season/posisi/leaderboard |
| `src/app/page.tsx` | Sisa landing: status live + CTA |
| `src/app/deposit/`, `src/app/claim/`, `src/components/vault/` | Deposit, faucet, estimasi, klaim |
| `package.json` | **Satu-satunya** yang menambah dependensi; yang lain minta lewat Farhan |

Selesai kalau: bisa connect wallet di 10143/31337, chain salah terblokir, banner ada di semua halaman, deposit dan klaim jalan di mock (lalu di anvil), dan test CTA serta wrong-network lulus.

### 👤 Jeki — Alur game (logika meja)
Nomor 12–20.

| Folder / file milik Jeki | Isi |
|---|---|
| `src/app/play/` | Pilih preset |
| `src/app/table/[id]/page.tsx` | Halaman meja (merangkai semua bagian) |
| `src/components/table/` | Header, papan koin, panel commit, reveal, panel pemain, hasil ronde, podium akhir |
| `src/lib/game/` | Tipe game, store `useTable`, mock engine, penyimpanan salt, typed-data EIP-712 |
| `packages/shared/src/scoring.ts` (sementara) | Rumus skor sesuai spec, kalau `packages/shared` belum dibuat |

Selesai kalau: satu game Quick penuh bisa dimainkan melawan 3 bot di mock dari awal sampai podium, reload saat Reveal tetap auto-reveal, dan skor live sama dengan skor akhir dari mock engine.

### 👤 Mario — Visual game, skill, statistik
Nomor 21–26.

| Folder / file milik Mario | Isi |
|---|---|
| `src/components/table-scene/` | Scene 3D coin spirits, ridge chart, fallback 2D |
| `src/components/world/` | Pemilik komponen 3D yang sudah ada (dipakai landing dan meja) |
| `src/components/skills/` | Kartu skill, picker target, animasi efek 6 skill |
| `src/components/chart/` | Chart harga, sparkline |
| `src/app/leaderboard/`, `src/app/profile/` | Leaderboard dan profil |
| `src/components/howto/` | Tutorial (update kalau aturan berubah) |

Selesai kalau: spirit bergerak mengikuti harga mock, keenam skill bisa dipilih dan dianimasikan (termasuk saat dikenai bot), fallback 2D jalan tanpa WebGL, dan leaderboard serta profil tampil dari mock.

### Titik sambung antar orang (sepakati di hari pertama)
- **Farhan → semua:** tipe API (`src/lib/api/types.ts`), UI kit, `format.ts`, dan providers. Yang lain mulai dengan mock lokal dulu sambil menunggu, lalu pindah ke punya Farhan.
- **Jeki → Mario:** tipe game dan hook `useTable(id)` (`src/lib/game/types.ts`). Mario membaca state meja **hanya** lewat hook ini, dan memanggil aksi skill lewat fungsi yang disediakan Jeki, misalnya `useSkill(kind, target)`.
- **Mario → Jeki:** komponen `<TableScene>`, `<SkillHand>`, dan `<PriceChart>` dengan props yang jelas, untuk dipasang Jeki di halaman meja.
- Perubahan pada tipe bersama dilakukan lewat PR yang di-review oleh pemiliknya.

---

## 4. Urutan kerja

| Tahap | Farhan | Jeki | Mario |
|---|---|---|---|
| **1. Fondasi** | Dependensi, providers, layout + banner, UI kit inti, tipe API + mock | Tipe game, rumus skor + test, mock game engine | Prototipe scene coin spirits dengan data palsu, chart dasar |
| **2. Fitur** | `/deposit`, estimasi pendapatan, landing live + CTA | `/play`, Commit, Reveal, panel pemain | Tangan skill + picker, animasi efek, sparkline di CoinCard |
| **3. Lengkap** | `/claim`, test CTA dan network | Hasil ronde, podium akhir, Play again | `/leaderboard`, `/profile`, fallback 2D |
| **4. Integrasi** | Ganti mock vault → kontrak asli (anvil) | Ganti mock meja → API/WS + relayer asli | Sambungkan chart ke stream harga asli |
| **5. Demo** | Jalur demo dari landing sampai klaim | Counter tx + link explorer | Polish animasi, cek reduced motion |

Tahap 4 bergantung pada backend (task fase 4) dan kontrak (fase 1–3). Sampai saat itu, semua fitur harus bisa didemokan dengan mock.

---

## 5. Aturan kerja bersama
- **Bahasa UI:** Inggris, angka en-US. Pakai "Buy/Sell", bukan "Up/Down".
- **Branch** per fitur `feat/frontend-<nama>`, lalu merge ke `main`. Format commit `feat(frontend): ...`, **tanpa** trailer Co-Authored-By AI.
- **Sebelum merge:** `pnpm --filter frontend build` dan `lint` hijau, test lulus, dicek di lebar 375 px dan dengan reduced motion.
- **Next.js 16 berbeda dari versi lama.** Baca panduan di `node_modules/next/dist/docs/` sebelum memakai API Next (lihat `AGENTS.md`).
- **Uang** selalu `bigint` (6 desimal), dan skor dalam bps integer. Jangan pakai float.
- **Keputusan desain baru** dicatat di `DECISIONS.md`.
