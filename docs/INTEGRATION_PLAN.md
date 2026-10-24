# Rencana integrasi backend + smart contract ke frontend

Untuk: **Farhan** dan **Mario**. Ditulis 2026-10-24 13:45 WIB. **Freeze submission 16:45**, jadi sisa ±3 jam.

Tujuan: frontend berhenti memakai `src/mocks/` dan memakai data asli (backend API + WebSocket + kontrak di Monad testnet 10143). Yang dinilai juri: **ada transaksi on-chain live saat demo** (faucet, deposit, hasil game tercatat, klaim) dan semua fitur yang diumumkan benar-benar jalan.

Rujukan: `docs/BACKEND_PLAN.md`, `docs/CONTRACTS_PLAN.md`, `docs/MONAD_BLITZ_NOTES.md`, `DECISIONS.md` (mesin game off-chain, 2026-10-24), `frontend/FE_PLAN.md`, `frontend/UI_GUARDRAILS.md`.

---

## 1. Peta sistem

```
Frontend (Next.js)
  ├─ wagmi/viem ──▶ MockUSD.faucet(), approve/permit, SeasonVault.deposit(), claim()   (wallet pemain menandatangani)
  ├─ REST ────────▶ backend: /seasons, /users/:addr/position|history|table, /tables/:id, /seasons/:id/leaderboard
  ├─ SIWE ────────▶ backend: /auth/nonce, /auth/verify  → bearer token
  ├─ REST (token) ▶ backend: POST /play, /tables/:id/picks, /tables/:id/skill
  └─ WebSocket ───▶ backend: /ws  subscribe "table:<id>" dan "prices"

Backend: mesin game off-chain + 3 house bot + keeper
  └─ keeper menulis ke chain: activate / finalize season, recordGame (hasil game pemain), fundBonus
```

Pembagian tanggung jawab uang vs game:
- **Wallet pemain** hanya menandatangani transaksi vault (faucet, deposit, klaim). **Tidak ada** tanda tangan per aksi game.
- **Game** (pick, skill, skor) berjalan di backend lewat REST + WebSocket dengan sesi SIWE. Hasil game dicatat on-chain oleh **keeper**, bukan oleh frontend.

### Alamat (Monad testnet 10143, `contracts/deployments/10143.json`, juga di `@jitu-fi/shared`)
| Kontrak | Alamat |
|---|---|
| MockUSD | `0x888054c88594D673f3C77CE99Aa73373ACfA1BdC` |
| SeasonVault | `0x87e83410FD37F6FfC37BC709DaA7DE7B64460266` |
| GameManager | `0x699834468547F56E38F87bFeeD15b3B2D6e343ff` |
| MockYieldStrategy | `0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083` |

Ambil alamat dan ABI dari `@jitu-fi/shared` (`deployments`, `abis`). **Jangan menulis alamat di kode FE.** Season id jangan di-hardcode: pakai `GET /seasons/current` (keeper memperbarui season demo).

---

## 2. Kontrak API (yang sudah ada di backend)

Semua field `bigint` dikirim sebagai **string desimal** (6 desimal untuk mUSD). Jangan ubah ke `number`.

| Method + path | Auth | Isi |
|---|---|---|
| `GET /config` | – | `presets`, `skills`, `coins` |
| `GET /seasons/current` | – | `{ seasons: [{ seasonId, tenor, status, start, end, totalPrincipal, bonusPot, … }] }` |
| `GET /seasons/:id/leaderboard` | – | `{ countedGames, bonusPot, entries: [{ rank, address, seasonPoints, gamesCounted, weight, estimatedBonus }] }` |
| `GET /users/:addr/position` | – | `{ position: null }` atau `{ seasonId, tenor, seasonStatus, principal, weight, seasonPoints, gamesCounted, countedGames, previewClaim }` |
| `GET /users/:addr/history` | – | `{ games: [{ tableId, preset, place, gameScore, credit, recordStatus, recordTxHash, rounds[] }] }` |
| `GET /users/:addr/table` | – | `{ tableId \| null }` (meja yang sedang berjalan) |
| `GET /tables/:id` | opsional | `TableState` (pick lawan disembunyikan sampai Reveal) |
| `GET /tables/:id/log` | – | log final (untuk `logHash`), hanya setelah game selesai |
| `POST /auth/nonce` → `POST /auth/verify` | – | SIWE → `{ token, address, expiresAt }` |
| `POST /play` | token | body `{ preset }` → `{ tableId }`. Galat: `NO_POSITION`, `SEASON_NOT_ACTIVE`, `NOT_ELIGIBLE`, `SEASON_CLOSING`, `ALREADY_AT_TABLE` (+`tableId`) |
| `POST /tables/:id/picks` | token | `{ picks: [{ coin, side: "Buy"\|"Sell", boosted?, insured? }] }` (boleh dikirim ulang sampai deadline Commit) |
| `POST /tables/:id/skill` | token | `{ skill: "LOCK"\|"FREEZE"\|"FLIP"\|"SWAP", targetSeat, targetCoin, swapTo? }` |
| `WS /ws` | – | kirim `{ "subscribe": "table:<id>" }` atau `"prices"`. Event meja: `roundStarted`, `picksSubmitted`, `revealed`, `liveStarted`, `skillUsed`, `roundSettled`, `gameFinished`. Event harga: `{ type: "prices", ticks: [{ coin, price, expo, publishTime }] }` |

Catatan penting dari kode backend:
- **Kursi 0 = pemain manusia**, kursi 1–3 = house bot. Urutan nama di `views.ts`: `you, Bruno, Bera, Dex`. Frontend memakai `HOUSE_BOTS` dengan urutan yang sama (Bruno, Bera, Dex).
- Pemain **harus punya posisi** (sudah deposit) di season yang **Active** untuk bisa `POST /play`. Urutan alur demo: faucet → deposit → tunggu season mulai → play.
- Skill saat Commit (BOOST, INSURANCE) dikirim sebagai flag `boosted` / `insured` di picks. Skill Live lewat `/skill`.
- `history` memakai side huruf kecil (`"buy"`/`"sell"`), sedangkan `TableState` memakai `"Buy"`/`"Sell"`. Normalisasi di lapisan API FE.
- Aturan skor ada di `@jitu-fi/shared` (`scoring.ts`, `skills.ts`). Skor live di FE **harus** memakai fungsi ini, bukan menyalin rumus.

---

## 3. Pembagian kerja

Satu aturan besar: **Farhan memegang fondasi dan alur uang (kontrak)**. **Mario memegang alur game dan statistik (backend REST/WS)**. Farhan mengunci tipe API dan klien; Mario memakainya.

### 👤 Farhan: fondasi + vault (wallet, deposit, klaim, landing)

| # | Tugas | Detail | File milik Farhan |
|---|---|---|---|
| **F1** | **Dependensi dan konfigurasi (blocker, kerjakan paling dulu, ±20 menit)** | Tambah `@privy-io/react-auth` (3.x), `@privy-io/wagmi` (4.x), `wagmi` (≥ 2), `viem` (**pin persis `2.57.5`**, karena `@privy-io/wagmi@4` mensyaratkan versi itu), `@tanstack/react-query`, dan `@jitu-fi/shared` (`workspace:*`) ke `frontend/package.json`. **Tidak memakai RainbowKit.** Urutan build: `@jitu-fi/shared` harus di-build sebelum frontend dan backend (tambahkan ke script root, mis. `pnpm -r --filter @jitu-fi/shared build` di awal). Env: `NEXT_PUBLIC_PRIVY_APP_ID=cjk40ih72f924nb11kxborss` (App ID Privy bersifat publik; **App Secret tidak dipakai di FE dan tidak boleh dikomit**), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_USE_MOCKS` (bendera fallback). Push ke `main` begitu hijau supaya Mario bisa pull. | `package.json`, `.env.example` |
| **F2** | **Providers + wallet Privy** | `PrivyProvider` (`appId` dari env) membungkus `QueryClientProvider` lalu `WagmiProvider` dari `@privy-io/wagmi`. Daftarkan Monad testnet **10143** (dan 31337 untuk lokal) sebagai chain khusus di Privy (`defaultChain` + `supportedChains`) dan di config wagmi (ambil `monadTestnet` dari viem/chains). Login: email, social, dan wallet eksternal. Embedded wallet dibuat otomatis untuk pengguna tanpa wallet (`createOnLogin: 'users-without-wallets'`). Ganti `DummyWalletProvider` dan tombol Connect di Nav dengan `usePrivy().login/logout` dan `useAccount`. Untuk tampilan tanpa pop-up konfirmasi pada tx game/vault, atur `showWalletUIs: false` hanya jika alurnya aman (tx uang tetap perlu konfirmasi yang jelas). Gating chain salah (overlay `WrongNetwork` jadi asli), **tolak chain 143**. State wallet hanya di client (hindari hydration mismatch). | `app/layout.tsx`, `app/providers.tsx`, `components/shell/**`, `lib/web3/**` |
| **F3** | **Klien API + sesi SIWE + tipe** | `lib/api/client.ts` (fetch + parsing string → `bigint`), `lib/api/types.ts` (cerminan mocks, **kunci bentuknya di awal**), hook react-query: `useSeasons`, `usePosition`. Hook `useSession()`: nonce → `signMessage` dari wallet Privy (embedded wallet adalah EOA, jadi `verifyMessage` di backend tetap valid) (SIWE, `domain` = domain yang dipakai backend, `chainId` 10143) → `verify` → simpan token (memori + `localStorage` dalam try/catch). Pesan galat 401 memicu login ulang. **Bagikan `useSession()` dan `apiFetch()` ke Mario.** | `lib/api/**`, `lib/auth/**` |
| **F4** | **`/deposit` on-chain** | Saldo mUSD, tombol **faucet** (`MockUSD.faucet()`, cooldown 1 jam dari kontrak), pilih tenor dari `/seasons/current`, input jumlah (min 10 mUSD), **approve lalu `SeasonVault.deposit(seasonId, amount)`** (atau `depositWithPermit`). State: pending, sukses, gagal, enrollment tutup, sudah punya posisi. Tampilkan **link explorer** untuk tiap tx. **Gas limit eksplisit = estimasi × 1,15** (Monad menagih gas limit). | `app/deposit/**`, `components/vault/**` |
| **F5** | **Landing: season live + CTA** | Kartu season dari `/seasons/current` dengan countdown asli, CTA "Play now" menyesuaikan posisi (belum deposit → `/deposit`, sudah → `/play`). | `app/page.tsx`, `components/landing/**` |
| **F6** | **`/claim` on-chain** | `previewClaim` dari `/users/:addr/position`, tombol **`SeasonVault.claim(seasonId)`**, state belum jatuh tempo, shortfall, sukses (+ link explorer). | `app/claim/**`, `components/vault/**` |
| **F7** | **Hosting + README** | Deploy frontend ke Vercel, isi env, masukkan **URL live** dan alamat kontrak ke README (syarat 4 poin Basic). Koordinasi domain dengan pemilik backend (lihat §5). | README, Vercel |

### 👤 Mario: alur game + statistik (REST/WS backend)

| # | Tugas | Detail | File milik Mario |
|---|---|---|---|
| **M1** | **`/play` → `POST /play`** | Pakai `useSession()` dari Farhan. Kirim preset, lalu `router.push('/table/<tableId>')`. Tangani galat: `NO_POSITION` (arahkan ke `/deposit`), `SEASON_NOT_ACTIVE` (tampilkan hitung mundur), `NOT_ELIGIBLE`, `SEASON_CLOSING`, `ALREADY_AT_TABLE` (lanjutkan ke `tableId` yang dikembalikan). Saat halaman dibuka, cek `GET /users/:addr/table` untuk melanjutkan meja yang berjalan. | `app/play/**` |
| **M2** | **Lapisan data meja** | `useTable(id)`: `GET /tables/:id` + subscribe WS `table:<id>`, reducer event → state yang dipakai komponen meja. **Ganti `demo-engine.ts` sebagai sumber state** dengan state server; waktu fase dari `phaseDeadlineMs`. Pertahankan demo engine sebagai fallback (`NEXT_PUBLIC_USE_MOCKS=1` atau `?demo=1`). Pick lawan **tidak ada** sampai `revealed`. | `components/table/**`, `lib/game/**`, `app/table/**` |
| **M3** | **Commit: `POST /tables/:id/picks`** | Kirim pick (Buy/Sell, `boosted`, `insured`). Boleh kirim ulang sampai deadline. Jatah pick per ronde dari `round.cap`. Tidak ada salt. Galat ditampilkan. | `components/table/**` |
| **M4** | **Live: skill + harga** | `SkillHand` dari `seat.hand` asli, `POST /tables/:id/skill` (LOCK/FLIP/SWAP/FREEZE; BOOST/INSURANCE saat Commit). Event `skillUsed` dari bot menjadi `IncomingSkillToast`. Subscribe WS `prices` untuk skor live, hitung dengan fungsi `@jitu-fi/shared`. | `components/skills/**`, `components/table/**` |
| **M5** | **Hasil + bukti on-chain** | Popup hasil (M9 yang sedang dikerjakan) memakai `gameFinished.gameScores`. Setelah selesai, ambil `GET /users/:addr/history`: tampilkan **"Recorded on-chain"** + link explorer dari `recordTxHash` / `recordStatus` (ini bukti tx live untuk juri). Kredit poin season dari `credit` (counted / outside-k / after-end). | `components/table/**` |
| **M6** | **Adapter 3D** | `fromDemoState` → `fromTableState(TableState)` supaya `TableView3D` memakai state server. | `components/table-scene/**` |
| **M7** | **`/leaderboard` + `/profile`** | `GET /seasons/:id/leaderboard` (tab per tenor dari `/seasons/current`), `GET /users/:addr/history`. Pertahankan state empty/loading. | `app/leaderboard/**`, `app/profile/**`, `components/stats/**` |

### Titik sambung (sepakati sekarang)
1. **Farhan menyelesaikan F1 + F3 lebih dulu dan push ±40 menit dari sekarang.** Sampai itu masuk, Mario mengerjakan M2/M3/M6 dengan **tipe meja milik sendiri** di `lib/game/types.ts`. Tipe itu cermin dari `backend/src/engine/types.ts` (`TableState`, `RoundJson`, `SeatState`, `EngineEvent`), karena kode backend tidak bisa diimpor langsung.
2. **Farhan memegang** `lib/api/client.ts`, `lib/api/types.ts` (season, posisi, leaderboard, history), dan `lib/auth/**`. **Mario memegang** `lib/game/**`. Perubahan di file milik yang lain: kabari dulu.
3. **Hanya Farhan yang menambah dependensi** (lihat FE_PLAN). Mario minta lewat chat.
4. Format uang: selalu `bigint` + `lib/format.ts`. Tidak boleh `Number()` untuk mUSD.

---

## 4. Urutan dan target waktu

| Waktu | Farhan | Mario |
|---|---|---|
| **13:45 – 14:25** | **F1 + F2 + F3** (push segera) | M2 + M3 + M6 dengan tipe `TableState` lokal, uji ke backend lokal atau mock |
| **14:25 – 15:15** | F4 `/deposit` + F5 landing | M1 `/play`, M4 skill + harga, M5 hasil |
| **15:15 – 15:50** | F6 `/claim`, F7 deploy Vercel | M7 leaderboard + profile |
| **15:50 – 16:20** | Uji alur penuh di URL live | Uji alur penuh di URL live, perbaikan |
| **16:20 – 16:45** | Isi README (URL + alamat), **submit** | Rekam video demo, siapkan post X |

Perapian visual oleh Codex di akhir hari **dibatalkan jika waktu tidak cukup**: prioritas tetap alur on-chain yang jalan.

### Alur demo 3 menit (target akhir)
1. Buka URL live → **Login Privy** (chain 10143).
2. `/deposit`: **faucet** → **deposit** (tx on-chain, tunjukkan link explorer).
3. `/play` → pilih **Quick** → meja: pilih koin, **Lock picks**, lihat Reveal dan Live, pakai **satu skill**.
4. **Game selesai** → popup hasil → **"Recorded on-chain"** (tx `recordGame`, link explorer).
5. `/leaderboard` → baris kamu naik. `/claim` (jika season sudah jatuh tempo; demo season 15/30 menit, siapkan season yang sudah selesai sebelumnya sebagai cadangan).

Panitia menyarankan **data yang sudah terisi**: siapkan wallet yang sudah punya saldo dan posisi di season yang sedang Active sebelum naik panggung.

---

## 4b. Privy (wallet + login)

App ID: `cjk40ih72f924nb11kxborss` (publik, boleh ada di `NEXT_PUBLIC_PRIVY_APP_ID`).

**Harus dikerjakan Farhan di dashboard Privy (dashboard.privy.io), bukan di kode:**
1. **Allowed origins / domains:** tambahkan `http://localhost:3000` dan domain Vercel. Tanpa ini login gagal dengan galat origin.
2. **Chain:** aktifkan custom chain **Monad testnet (10143)** dan RPC `https://testnet-rpc.monad.xyz`.
3. **Login methods:** aktifkan email + wallet (tambah social bila diperlukan). **Embedded wallet** diaktifkan.
4. Pastikan **App Secret** tidak masuk repo.

**Hal yang perlu diwaspadai:**
- **Embedded wallet baru berisi 0 MON**, sehingga tidak bisa membayar gas. Faucet mUSD itu transaksi biasa yang butuh gas. Solusi demo: kirim sedikit MON testnet ke wallet demo dari `faucet.monad.xyz` **sebelum** naik panggung (atau tampilkan tombol "Copy address" + tautan faucet di `/deposit` saat saldo MON = 0). Privy tidak menyediakan gasless di sini.
- **SIWE:** backend memverifikasi `verifyMessage` (ecrecover EOA). Embedded wallet Privy adalah EOA, jadi cocok. **Jangan** aktifkan smart wallet/ERC-4337 di Privy untuk app ini, karena tanda tangannya tidak bisa diverifikasi dengan cara itu. `SIWE_DOMAIN` backend harus sama dengan host FE.
- **Chain 143 (mainnet) ditolak**: batasi `supportedChains` hanya ke 10143 (+ 31337 lokal).
- State auth Privy hanya di client; tampilkan setelah `ready` (`usePrivy().ready`) untuk menghindari hydration mismatch.
- `viem` harus persis `2.57.5` (peer `@privy-io/wagmi`). Jika bentrok dengan `packages/shared` atau backend (viem ≥ 2.40), samakan versinya di satu tempat.

---

## 5. Prasyarat di luar frontend (harus ada yang memegang)

| Item | Pemilik yang disarankan | Catatan |
|---|---|---|
| **Backend ter-host** (Railway/Fly/VM) dengan URL publik + `wss://` | hanchyp (pemilik backend) | Tanpa ini, FE di Vercel tidak punya API. SQLite butuh disk persisten. |
| Env backend: `KEEPER_PRIVATE_KEY` (punya role SEASON_MANAGER + RESULT_POSTER, saldo > 10 MON), `GAME_ID_SALT`, `SESSION_SECRET`, `PYTH_API_KEY` | hanchyp | **Kunci tidak pernah dibagikan ke agent atau dikomit.** |
| `CORS_ORIGIN` = domain Vercel; `SIWE_DOMAIN` = domain yang sama (tanpa `https://`) | hanchyp + Farhan | Tidak cocok → login SIWE gagal. |
| Season demo dalam keadaan Active dengan bonus pot terisi (`fundBonus`) | hanchyp (keeper) | Agar hadiah terlihat berarti. |
| Wallet demo berisi **MON testnet** (embedded wallet Privy baru = 0 MON) | tiap orang | Faucet `faucet.monad.xyz`. Jangan pakai wallet utama. |
| Dashboard Privy: allowed origins, chain 10143, login methods | Farhan | Lihat §4b. |

Jalankan backend lokal untuk pengembangan:
```sh
pnpm install
pnpm --filter @jitu-fi/shared build
cp backend/.env.example backend/.env   # isi SESSION_SECRET; PRICE_SOURCE=mock bila tanpa kunci Pyth
pnpm --filter backend dev              # http://localhost:4000
```

---

## 6. Risiko dan cadangan

| Risiko | Penanganan |
|---|---|
| Backend belum ter-host saat freeze | **Bendera mock** (`NEXT_PUBLIC_USE_MOCKS=1`) menjaga UI tetap bisa didemokan; tx vault (faucet, deposit, klaim) tetap jalan karena langsung ke chain. |
| SIWE gagal karena domain | Uji login di URL Vercel lebih awal (jam 15.00), bukan di menit terakhir. |
| Gas Monad ditagih per **gas limit** | Semua tx FE: `gas = ceil(estimate × 115 / 100)`. |
| Season sudah lewat saat demo | Gunakan season terbaru dari `/seasons/current`; siapkan satu posisi cadangan. |
| Hydration mismatch dari state wallet | Render state wallet hanya setelah `usePrivy().ready`; uji `next build` + buka di tab baru. |
| Tabrakan merge Farhan ↔ Mario | Folder terpisah (lihat tabel), `git pull` sebelum push, commit kecil. Konflik `DECISIONS.md`: pertahankan kedua entri. |
| Aturan produk | Tetap **testnet saja** (10143), tolak 143. Uang `bigint`. Tanpa trailer AI di commit. |

## 7. Definisi selesai
- [ ] Login Privy (embedded wallet atau wallet eksternal) di 10143; chain salah terblokir.
- [ ] Faucet + deposit **tx nyata** di testnet, link explorer tampil.
- [ ] `/play` membuat meja asli; pick dan skill terkirim ke backend; fase berjalan lewat WebSocket.
- [ ] Game selesai → hasil tampil + **`recordGame` tercatat on-chain** (link explorer).
- [ ] `/leaderboard` dan `/profile` membaca data asli.
- [ ] `/claim` memanggil `claim` (atau menampilkan state belum jatuh tempo dengan jujur).
- [ ] FE ter-hosting (Vercel), README berisi URL live + alamat kontrak + cara menjalankan.
- [ ] `pnpm -r build` dan lint hijau; tidak ada error console di alur utama.
