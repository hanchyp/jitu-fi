# Crypto Draft — Build Spec untuk Claude Code

> Dokumen ini adalah instruksi eksekusi lengkap untuk membangun MVP hackathon **Crypto Draft: Deposito Bergame di Monad**.
> Kerjakan **fase demi fase** (lihat §10). Setiap fase punya kriteria selesai. Jangan lanjut ke fase berikutnya sebelum test fase itu lulus.

---

## 0. Instruksi untuk Claude Code (baca dulu)

1. **Bahasa kode & komentar:** Inggris. Teks UI: Bahasa Indonesia (sediakan file i18n sederhana agar bisa diganti).
2. **Jangan menebak alamat kontrak pihak ketiga** (Pyth, Pyth Entropy, dsb.). Ambil dari dokumentasi resmi (Pyth docs / halaman Network Information Monad). Jika tidak bisa dipastikan, letakkan di `.env` sebagai `TODO_FILL_ME` dan pakai **MockOracle** untuk lokal/test.
3. **Testnet saja.** Jangan pernah deploy ke mainnet atau memakai dana sungguhan. Stablecoin = `MockUSD` buatan sendiri.
4. Semua angka uang memakai integer (tanpa float). Stablecoin 6 desimal. Return/skor dalam **basis points (bps)**.
5. Setelah setiap fase: jalankan test, perbaiki sampai hijau, lalu commit dengan pesan yang jelas (`feat(contracts): ...`).
6. Bila ada keputusan desain yang ambigu dan tidak tercakup dokumen ini, pilih opsi **paling sederhana yang aman**, catat di `DECISIONS.md`, lanjutkan.
7. **Guardrail produk (WAJIB, jangan dilanggar):**
   - Tidak ada buy-in / entry fee per game.
   - Tidak ada taruhan penonton.
   - Pokok (principal) **tidak pernah** dipotong atau dipertaruhkan.
   - Kontrak game **tidak punya akses** ke token/pokok.
   - Pemenang ditentukan oleh **peringkat skor**, bukan undian.

---

## 1. Ringkasan produk

User menyetor stablecoin ke **vault musim** dengan tenor terkunci. Dana diparkir di strategi yield. Selama tenor, user bermain game **Crypto Draft** (4 pemain, 3 ronde, ~15 menit per game) dan mengumpulkan poin musim. Di akhir musim:

- **Pokok** kembali utuh ke semua penyetor.
- **Yield** dikurangi fee platform, lalu dibagi:
  - **Yield dasar** (default 50%): rata sesuai setoran — dijamin, walau kalah.
  - **Pot bonus** (default 50%): sesuai bobot skor musim.

Kalimat pitch: *"Deposito on-chain di Monad. Pokok aman, bunga tetap jalan, dan kalau kamu jago, bunganya bisa berlipat."*

---

## 2. Fakta jaringan Monad (sudah diverifikasi, Oktober 2026)

| Item | Nilai |
|---|---|
| Testnet chain ID | `10143` |
| Testnet RPC | `https://testnet-rpc.monad.xyz` (WS: `wss://testnet-rpc.monad.xyz`) |
| Mainnet chain ID (jangan dipakai) | `143` |
| Explorer testnet | `https://testnet.monadvision.com`, `https://testnet.monadscan.com` |
| Faucet | `https://faucet.monad.xyz` |
| Native token | MON |
| Block time | ~300 ms; finalized setelah 2 block (~600 ms) |
| `block.timestamp` | **granularitas detik** — 3–4 block berurutan bisa punya timestamp sama |
| Gas | **Yang ditagih adalah gas LIMIT, bukan gas used.** Limit per tx 30M, per block 150M |
| Reserve balance | Default 10 MON (ada aturan inklusi/revert tertentu; EOA yang di-delegate via EIP-7702 tidak bisa turun di bawah 10 MON) |
| Ukuran kontrak maks | 128 KB |
| Tipe tx | 0, 1, 2, 4 (tidak ada tipe 3 / blob) |
| WS subscribe | `newHeads`, `logs` (+ `monadNewHeads`, `monadLogs`). **Tidak ada** `newPendingTransactions` |
| Mempool | Tidak ada mempool global (tiap validator lokal) |
| Tooling minimum | Foundry ≥ 1.8.0, viem ≥ 2.40.0 |
| Oracle harga | Pyth (pull), Chainlink (push/pull), RedStone, Chronicle, Supra, Stork |
| Randomness (VRF) | Pyth Entropy, Supra dVRF; Gelato VRF (testnet) |

**Implikasi desain yang wajib diterapkan:**

- **Set gas limit eksplisit & ketat** di setiap tx dari relayer/keeper (estimasi + margin kecil, mis. +15%), karena yang dibayar adalah limitnya.
- Fase game memakai deadline berbasis `block.timestamp` (detik) — aman untuk fase 15–180 detik.
- UI boleh update saat receipt muncul; tidak perlu logika reorg rumit.
- Wallet relayer/keeper harus disangu MON cukup (jauh di atas 10 MON).

Sumber: docs.monad.xyz (`/ai/current-facts.md`, `/developer-essentials/summary`, `/tooling-and-infra/oracles`). Re-verifikasi bila ada keraguan.

---

## 3. Arsitektur

```
┌──────────────────────── Frontend (Next.js) ────────────────────────┐
│ Deposit · Lobby · Meja Game · Leaderboard · Klaim                  │
│ wagmi/viem · EIP-712 signing · WebSocket client · price chart      │
└───────────────▲───────────────────────────────▲────────────────────┘
                │ REST + WebSocket              │ wallet tx (approve/deposit/claim)
┌───────────────┴──────── Backend (Node/TS) ────┼────────────────────┐
│ API · Matchmaker · Relayer (meta-tx) · Keeper (fase & harga)       │
│ Indexer (log listener → DB) · Price stream proxy (Pyth Hermes)     │
└───────────────┬───────────────────────────────┼────────────────────┘
                │ tx (relayed/keeper)           │
┌───────────────▼──────── Smart Contracts (Monad testnet) ───────────┐
│ MockUSD · SeasonVault · IYieldStrategy(MockYieldStrategy)          │
│ GameManager · CoinRegistry · IPriceOracle(Pyth/Mock) · IRandomness │
└────────────────────────────────────────────────────────────────────┘
```

**Prinsip keamanan inti:** `GameManager` hanya menulis **poin musim**. `SeasonVault` hanya **membaca** poin itu saat finalisasi. Token hanya bisa keluar dari `SeasonVault` ke pemiliknya (claim) atau ke `feeRecipient` (fee). Bug di game paling buruk mengacaukan distribusi bonus, tidak pernah menghilangkan pokok.

### Struktur repo (monorepo, pnpm workspaces)

```
crypto-draft/
├─ contracts/          # Foundry
│  ├─ src/
│  ├─ test/
│  ├─ script/
│  └─ foundry.toml
├─ backend/            # Node 20+, TypeScript
├─ frontend/           # Next.js 14+ App Router
├─ packages/shared/    # ABI, tipe TS, konstanta game, util skor (dipakai BE & FE)
├─ bots/               # 4 bot pemain untuk e2e & demo
├─ DECISIONS.md
└─ README.md
```

---

## 4. Konstanta game (single source of truth: `packages/shared/src/config.ts` + mirror di kontrak)

| Konstanta | Nilai MVP | Catatan |
|---|---|---|
| `PLAYERS_PER_TABLE` | 4 | |
| `ROUNDS_PER_GAME` | 3 | |
| `COINS_ON_TABLE` | 8 | dipilih acak dari registry (≥ 12 koin) |
| `PICKS_PER_ROUND` | 3 | koin unik per pemain per ronde |
| `COMMIT_DURATION` | 30 s | fase memilih (tertutup) |
| `REVEAL_DURATION` | 20 s | auto-reveal oleh client |
| `LIVE_DURATION` | 120 s | demo; produksi 120–180 s |
| `CONTRARIAN_MULT_BPS` | 1 pemain: 15000 · 2 pemain: 12500 · 3–4: 10000 | per koin+arah |
| `RANK_POINTS` | 4, 3, 2, 1 | seri → rata-rata (lihat §5.4) |
| `ROUND_MULT_X10` | 10, 15, 20 | ×1, ×1,5, ×2 |
| `MAX_SKILLS_IN_HAND` | 3 | |
| `SKILLS_MVP` | GIFT_COIN, LOCK, SHIELD | `SWAP`, `INVERT` = stretch |
| `FEE_BPS` | 1500 | fee platform dari yield |
| `BASE_YIELD_BPS` | 5000 | sisa → pot bonus |
| `WEIGHT_CAP` | 1.000 mUSD | setoran di atas cap tidak menambah bobot bonus |
| `SEASON_DURATION` | 7 hari (prod) · **30 menit (DEMO_MODE)** | |
| `ENROLLMENT_WINDOW` | 1 hari (prod) · 5 menit (DEMO) | |
| `MIN_DEPOSIT` | 10 mUSD | |

---

## 5. Smart contracts (Solidity ^0.8.24, Foundry, OpenZeppelin v5)

### 5.1 `MockUSD.sol`
- ERC20 + ERC20Permit, 6 desimal, nama "Mock USD", simbol "mUSD".
- `faucet()` publik: mint 1.000 mUSD ke caller, cooldown 1 jam per alamat.
- `MINTER_ROLE` untuk `MockYieldStrategy` (mensimulasikan yield).

### 5.2 `IYieldStrategy.sol` + `MockYieldStrategy.sol`
```solidity
interface IYieldStrategy {
    function asset() external view returns (address);
    function deposit(uint256 amount) external;          // onlyVault
    function withdrawAll() external returns (uint256);  // onlyVault, kirim semua ke vault
    function totalAssets() external view returns (uint256);
}
```
- Mock: `totalAssets = principal + accrued`, `accrued = principal * aprBps * elapsed / (10000 * 365 days)`. Pada `withdrawAll` mint `accrued` lalu transfer semua ke vault.
- `aprBps` bisa di-set admin. **DEMO_MODE** memakai APR sangat besar (mis. 500000 = 5000%) agar yield terlihat dalam 30 menit — wajib diberi label "simulasi" di UI.
- Desain interface agar nanti bisa diganti adapter protokol lending nyata.

### 5.3 `SeasonVault.sol`
State per musim:
```solidity
enum SeasonStatus { Enrollment, Active, Finalized }
struct Season {
    uint64 enrollStart; uint64 start; uint64 end;
    SeasonStatus status;
    uint256 totalPrincipal;
    uint256 totalWeightedPoints;   // Σ points_i × weight_i (diisi saat finalize, lihat bawah)
    uint256 baseYield; uint256 bonusPot; uint256 fee;
}
struct Position { uint256 principal; uint256 weight; bool claimed; }
mapping(uint256 => Season) seasons;
mapping(uint256 => mapping(address => Position)) positions;
```
Fungsi:
- `createSeason(enrollStart, start, end)` — admin.
- `deposit(seasonId, amount)` / `depositWithPermit(...)` — hanya saat `Enrollment` (`block.timestamp < start`). Tambah ke posisi. `weight = min(principal, WEIGHT_CAP)`.
- `activate(seasonId)` — siapa pun setelah `start`: kirim `totalPrincipal` ke strategy.
- `finalize(seasonId)` — siapa pun setelah `end`:
  1. `withdrawAll()` dari strategy → `total`.
  2. `yield = total > totalPrincipal ? total - totalPrincipal : 0`. (Jika rugi: catat `shortfall`, bagi pokok pro-rata, emit event. Mock tidak akan rugi, tapi tangani.)
  3. `fee = yield * FEE_BPS / 10000` → transfer ke `feeRecipient`.
  4. `baseYield = (yield - fee) * BASE_YIELD_BPS / 10000`, `bonusPot = sisa`.
  5. Ambil `totalWeightedPoints` dari `GameManager.seasonTotalWeighted(seasonId)` (lihat §5.5). Jika 0 → `baseYield += bonusPot; bonusPot = 0`.
- `claim(seasonId)` — penyetor, setelah `Finalized`, sekali:
  - `base = baseYield * principal / totalPrincipal`
  - `bonus = bonusPot * (points_i * weight_i) / totalWeightedPoints` (`points_i` dari `GameManager`)
  - transfer `principal + base + bonus`.
- View: `previewClaim(seasonId, user)`, `isEligible(seasonId, user)` (dipakai GameManager: punya posisi & musim `Active`).
- Rounding dust → tetap di vault, bisa disapu admin ke musim berikutnya (`sweepDust`, hanya setelah semua klaim atau 30 hari).
- `ReentrancyGuard`, `SafeERC20`, `Ownable2Step`/`AccessControl`, `Pausable` (pause hanya menghentikan deposit baru; **claim tidak boleh bisa di-pause**).

**Invariant (wajib jadi Foundry invariant test):**
- Untuk setiap musim Finalized: Σ klaim ≤ total ditarik dari strategy − fee.
- Setiap penyetor yang klaim menerima ≥ principal miliknya (kecuali kasus shortfall strategy).
- `GameManager` tidak pernah bisa memanggil fungsi yang memindahkan token.

### 5.4 `GameManager.sol`

**Lifecycle meja:**
```
Created → (4 pemain join) → Round r: Commit → Reveal → Live → Settled → ... → Finished
```

Struct utama:
```solidity
enum Phase { Waiting, Commit, Reveal, Live, Settled, Finished }
enum Dir { Buy, Sell }
struct Pick { uint8 coinIdx; Dir dir; bool locked; int64 lockedRetBps; bool gifted; }
struct Table {
    uint256 seasonId; address[4] players; uint8 round; Phase phase;
    uint64 phaseDeadline;
    uint16[8] coinIds;            // index ke CoinRegistry
    int64[8] startPrice; int64[8] endPrice; int32 priceExpo; // per koin di meja
    int256[4] roundScoreBps; uint256[4] gamePointsX10;
}
mapping(uint256 tableId => mapping(uint8 round => mapping(address => bytes32))) commits;
mapping(uint256 tableId => mapping(uint8 round => mapping(address => Pick[]))) picks; // 3 + 0..1 gift
mapping(address => uint8[]) skillHand; // per meja (scope per tableId)
```

Fungsi (semua aksi pemain punya versi `...BySig` dengan EIP-712 untuk relayer):
- `createTable(seasonId, players[4])` — `MATCHMAKER_ROLE` (backend). Validasi `vault.isEligible` tiap pemain. Bagikan 1 skill acak per pemain.
- `startRound(tableId)` — keeper: pilih 8 koin acak via `IRandomness`, set `phase=Commit`, deadline.
- `commit(tableId, round, commitHash)` — `commitHash = keccak256(abi.encode(tableId, round, player, coinIdx[3], dirs[3], salt))`.
- `reveal(tableId, round, coinIdx[3], dirs[3], salt)` — validasi hash, koin unik & ada di meja.
- `startLive(tableId, bytes[] priceUpdate)` — keeper, `payable` (fee oracle): setelah Reveal deadline. Snapshot `startPrice` 8 koin. Pemain yang tidak commit/reveal → ditandai `forfeit` (peringkat terakhir ronde itu).
- `useSkill(tableId, skill, target, coinIdx, bytes[] priceUpdate)` — hanya fase `Live`, maks 1 skill per pemain per ronde:
  - **GIFT_COIN**: tambah 1 pick ke `target` (koin acak dari meja, arah acak, flag `gifted`, multiplier ×1). Maks 1 gift diterima per pemain per ronde.
  - **LOCK**: kunci hasil 1 pick milik sendiri pada harga saat ini (butuh `priceUpdate`).
  - **SHIELD**: set flag; skill berikutnya yang menargetkan pemain ini di ronde ini dibatalkan (emit event `SkillBlocked`).
- `settleRound(tableId, bytes[] priceUpdate)` — keeper setelah Live deadline: snapshot `endPrice`, hitung skor (§5.4.1), beri poin, beri 1 skill tambahan ke peringkat terakhir (jika tangan < 3), lanjut ronde / `Finished`.
- Saat `Finished`: tambah `gamePointsX10` ke `seasonPoints[seasonId][player]`.
- View untuk vault: `seasonPoints(seasonId, user)`, `seasonTotalWeighted(seasonId)`.
  - `seasonTotalWeighted` dihitung inkremental: saat menambah poin ke pemain, `total += pointsDelta * vault.weightOf(seasonId, player)` (weight tetap karena deposit sudah terkunci saat musim Active).

#### 5.4.1 Perhitungan skor (implementasikan identik di Solidity dan `packages/shared/src/scoring.ts`, dan uji dengan test vector yang sama)
Untuk setiap pick pemain:
```
retBps = (endPrice - startPrice) * 10000 / startPrice     // pakai harga lock jika locked
if dir == Sell: retBps = -retBps
mult = gifted ? 10000 : contrarianMult(countSame(coinIdx, dir among revealed players))
pickScore = retBps * mult / 10000
roundScoreBps = Σ pickScore
```
Peringkat ronde: urutkan `roundScoreBps` menurun. Pemain forfeit selalu di bawah. Seri → rata-rata poin peringkat yang ditempati (gunakan skala ×2 agar integer, atau simpan ×10). `gamePointsX10 += rankPoints * ROUND_MULT_X10[round]`.

Harga: oracle mengembalikan `price` + `expo`; semua koin dinormalisasi ke expo yang sama sebelum hitung, atau hitung rasio langsung (expo saling menghapus untuk koin yang sama — `startPrice` dan `endPrice` koin yang sama pakai expo sama).

### 5.5 `CoinRegistry.sol`
- Daftar koin: `{ symbol, priceFeedId (bytes32 Pyth), active }`. Admin bisa tambah/nonaktifkan.
- Seed minimal 12 koin likuid (BTC, ETH, SOL, MON, BNB, XRP, DOGE, AVAX, LINK, ARB, OP, SUI, dst.) — **ambil price feed ID resmi dari Pyth**, jangan menebak.

### 5.6 `IPriceOracle` — `PythPriceOracle` & `MockPriceOracle`
```solidity
interface IPriceOracle {
    function updateFee(bytes[] calldata data) external view returns (uint256);
    function update(bytes[] calldata data) external payable;
    function getPrice(bytes32 feedId) external view returns (int64 price, int32 expo, uint64 publishTime);
}
```
- Pyth: `updatePriceFeeds{value: fee}(data)` lalu `getPriceNoOlderThan(id, MAX_AGE=15s)`.
- Mock: admin set harga; dipakai untuk unit test & lokal (anvil). Bot e2e lokal bisa menggerakkan harga mock.

### 5.7 `IRandomness`
- MVP: `PseudoRandomness` = `keccak256(blockhash(block.number-1), tableId, round, nonce)` — **beri komentar NOT SECURE, DEMO ONLY**.
- Stretch: adapter **Pyth Entropy** (callback async) — tambahkan state menunggu callback sebelum Commit.

### 5.8 Meta-transaction (relayer)
- `GameManager` mewarisi OZ `EIP712`. Typed data: `Commit`, `Reveal`, `UseSkill`, masing-masing dengan `player, tableId, round, ..., nonce, deadline`.
- Nonce per pemain. Siapa pun boleh submit (relayer membayar gas). Pemain cukup tanda tangan — **tanpa popup tx dan tanpa perlu MON** untuk bermain.
- Deposit: dukung `depositWithPermit` agar pemain cukup tanda tangan permit (relayer boleh submit), tapi pemain juga boleh deposit langsung.

### 5.9 Events (dipakai indexer)
`SeasonCreated, Deposited, SeasonActivated, SeasonFinalized, Claimed, TableCreated, RoundStarted(coins), Committed, Revealed(picks), LiveStarted(prices), SkillUsed, SkillBlocked, CoinGifted, PickLocked, RoundSettled(scores, ranks, points), GameFinished(points)`.

### 5.10 Test kontrak (Foundry)
- Unit: setiap fungsi + revert path (fase salah, deadline lewat, hash salah, koin duplikat, bukan pemain).
- Skor: test vector bersama (`packages/shared/test-vectors/scoring.json`) — Solidity & TS harus menghasilkan output identik.
- Fuzz: retBps, contrarian count, seri peringkat.
- Invariant: §5.3.
- Skenario penuh: 4 pemain deposit → musim aktif → 1 game 3 ronde (MockOracle) → finalize → klaim → cek saldo.
- `forge snapshot` untuk gas; pastikan fungsi keeper < 2M gas.

---

## 6. Backend (`backend/`)

**Stack:** Node 20+, TypeScript, Fastify, `ws` (atau Socket.IO), viem ≥ 2.40, Drizzle ORM + SQLite (lokal) / Postgres (deploy), Zod, pino.

### 6.1 Modul
| Modul | Tanggung jawab |
|---|---|
| `api` | REST: seasons, posisi user, tables, history, leaderboard, `previewClaim`. Auth: Sign-In With Ethereum (SIWE) sederhana untuk endpoint WebSocket lobby |
| `matchmaker` | Antrean lobby per musim; saat 4 pemain siap → `createTable` on-chain; isi bot jika `DEMO_MODE` dan antrean menunggu > 20 s |
| `relayer` | Terima payload EIP-712 dari FE, validasi off-chain (signature, fase, deadline), submit tx. Antrean dengan nonce manager, **gas limit eksplisit** (estimate × 1.15), retry idempoten |
| `keeper` | Scheduler per meja: `startRound` → (deadline commit) → (deadline reveal) `startLive` → (deadline live) `settleRound`. Juga `activate` & `finalize` musim. Idempoten: cek state on-chain sebelum kirim |
| `prices` | Ambil update data dari Pyth Hermes untuk `startLive`/`settleRound`/`LOCK`; stream harga real-time (SSE Hermes) ke FE via WS |
| `indexer` | Subscribe `logs` via WS + backfill `eth_getLogs` per blok; simpan ke DB; broadcast event ke room meja via WS |

### 6.2 Skema DB (ringkas)
`seasons, positions, tables, table_players, rounds, picks, skills_used, round_results, season_points, processed_blocks`.

### 6.3 Endpoint & channel
- `GET /seasons/current`, `GET /seasons/:id/leaderboard`, `GET /users/:addr/position`, `GET /tables/:id`, `GET /users/:addr/history`
- `POST /relay/commit|reveal|skill|deposit-permit` (body = typed data + signature)
- `POST /lobby/join`, `POST /lobby/leave`
- WS rooms: `lobby:<season>`, `table:<id>` (events: phase change, reveal, skill, prices tick, round result), `prices` (tick ~1 s untuk koin di meja aktif)

### 6.4 Env
```
RPC_URL=https://testnet-rpc.monad.xyz
WS_URL=wss://testnet-rpc.monad.xyz
CHAIN_ID=10143
RELAYER_PRIVATE_KEY=
KEEPER_PRIVATE_KEY=
MATCHMAKER_PRIVATE_KEY=
SEASON_VAULT_ADDRESS=
GAME_MANAGER_ADDRESS=
COIN_REGISTRY_ADDRESS=
PYTH_CONTRACT_ADDRESS=TODO_FILL_ME   # dari docs Pyth, jangan menebak
PYTH_HERMES_URL=https://hermes.pyth.network
DATABASE_URL=
DEMO_MODE=true
```

### 6.5 Test backend
- Unit: validasi payload, scheduler state machine, scoring TS vs test vector.
- Integrasi: anvil lokal + kontrak hasil deploy script + MockOracle; jalankan 1 game penuh lewat API.

---

## 7. Frontend (`frontend/`)

**Stack:** Next.js 14+ App Router, TypeScript, Tailwind, wagmi + viem, RainbowKit (embedded wallet seperti Privy = stretch), TanStack Query, Framer Motion, `lightweight-charts`, Zustand.

### 7.1 Halaman & komponen
| Route | Isi |
|---|---|
| `/` | Hero + kalimat pitch, cara kerja 3 langkah (Setor → Main → Klaim), status musim, CTA |
| `/deposit` | Faucet mUSD, input jumlah, info tenor & hitung mundur, ringkasan "pokok aman, yield dasar dijamin", tombol deposit (permit atau approve+deposit) |
| `/lobby` | Tombol "Cari meja", status antrean, daftar pemain, masuk otomatis ke meja |
| `/table/[id]` | **Layar utama game** (lihat 7.2) |
| `/leaderboard` | Peringkat musim: poin, bobot, estimasi bonus |
| `/claim` | Setelah musim selesai: rincian pokok + yield dasar + bonus, tombol klaim |
| `/profile` | Riwayat game, skor per ronde |

### 7.2 Layar meja game
- Header: ronde (1/3), fase + timer hitung mundur, pengali ronde.
- **Meja koin**: 8 kartu koin (logo, simbol, mini sparkline, harga live).
- Fase **Commit**: pilih 3 koin, toggle **Buy/Sell** tiap koin, tombol "Kunci pilihan" → sign EIP-712 `Commit` → relay. Simpan `salt` + pilihan di `localStorage` (key: `table:round:address`).
- Fase **Reveal**: auto-reveal dari localStorage (tanpa interaksi). Lalu animasi buka kartu semua pemain + badge pengali kontrarian (×1,5 / ×1,25 / ×1).
- Fase **Live**: 4 panel pemain dengan skor real-time (dihitung FE dari harga live + rumus shared), grafik harga, tangan skill (kartu skill dengan target picker), animasi **koin kiriman terbang** ke portofolio lawan, efek **Tameng** memblok.
- Hasil ronde: tabel peringkat + poin; toast "Kamu dapat skill tambahan" untuk peringkat terakhir.
- Akhir game: podium, poin masuk musim, tombol "Main lagi".
- Banner permanen: "Testnet · yield disimulasikan" saat `DEMO_MODE`.

### 7.3 Prinsip UX
- Tidak ada popup wallet selama bermain (semua via tanda tangan EIP-712 yang di-relay). Opsional: "session signer" lokal (kunci ephemeral di browser yang didaftarkan sekali) sebagai stretch.
- Optimistic UI saat tx relay; konfirmasi ketika event indexer masuk (~detik).
- Mobile-first, bisa dimainkan di layar ponsel.
- Teks dalam Bahasa Indonesia, angka format `id-ID`.

---

## 8. Bots (`bots/`)
- Script TS yang menjalankan N pemain (default 4) dengan private key test: faucet → deposit → join lobby → commit acak/heuristik → reveal → kadang pakai skill.
- Mode `--local` (anvil + MockOracle yang harganya digerakkan random walk) dan `--testnet`.
- Dipakai untuk e2e test dan untuk mengisi meja saat demo (juri bermain melawan 3 bot).

---

## 9. Deploy scripts (`contracts/script/`)
1. `Deploy.s.sol`: MockUSD → MockYieldStrategy → SeasonVault → CoinRegistry (seed koin) → Oracle (Pyth adapter atau Mock) → Randomness → GameManager; set role & alamat silang; buat musim demo.
2. Tulis alamat ke `packages/shared/src/deployments/<chainId>.json` + ekspor ABI.
3. `Makefile`/pnpm script: `deploy:local`, `deploy:testnet`, `verify:testnet` (bila explorer mendukung).

---

## 10. Rencana eksekusi (fase)

| Fase | Pekerjaan | Kriteria selesai |
|---|---|---|
| **0. Setup** | Monorepo pnpm, Foundry (≥1.8.0), Next.js, backend skeleton, lint/format, CI script lokal | `pnpm -r build` & `forge build` sukses |
| **1. Kontrak inti** | MockUSD, IYieldStrategy+Mock, SeasonVault, test | Unit + invariant vault hijau |
| **2. Kontrak game** | CoinRegistry, IPriceOracle+Mock+Pyth adapter, IRandomness, GameManager, EIP-712, scoring + test vector | Skenario penuh 1 game di Foundry hijau; skor Solidity = TS |
| **3. Deploy** | Script deploy lokal & testnet, ekspor ABI/alamat | Deploy anvil sukses; deploy testnet sukses (bila key tersedia) |
| **4. Backend** | Indexer, keeper, relayer, matchmaker, API, WS, prices | Integrasi anvil: 4 pemain via API menyelesaikan 1 game |
| **5. Frontend** | Semua halaman §7, integrasi wallet, WS, signing | Bisa deposit → main 1 game → lihat leaderboard → klaim (lokal) |
| **6. Bots & E2E** | Bot runner, e2e script | `pnpm e2e:local` hijau dari nol sampai klaim |
| **7. Demo polish** | DEMO_MODE (musim 30 menit), animasi, banner, README demo, skrip demo 3 menit | Demo bisa dijalankan ulang dari README |

**Stretch (hanya bila fase 0–7 selesai):** skill SWAP & INVERT, Pyth Entropy, pilihan tenor 7/14/30 + boost bobot, auto-rollover musim, embedded wallet/session signer, counter "transaksi on-chain di game ini" live, Spotlight Round (sponsor top-up pot via `fundBonus(seasonId, amount)`).

---

## 11. Skrip demo 3 menit (untuk README)
1. (20 s) Masalah: spekulasi crypto tak terbatas; kami bikin deposito yang bisa dimainkan.
2. (30 s) Setor 100 mUSD → tampil "pokok aman, terkunci 30 menit (demo)".
3. (90 s) Juri main 1 ronde melawan 3 bot: pilih koin + buy/sell, reveal dengan bonus kontrarian, pakai skill Koin Kiriman, lihat skor live. Tunjukkan counter tx on-chain & explorer.
4. (30 s) Akhir musim: klaim → pokok + yield dasar + bonus. Tekankan: tanpa buy-in, pokok tidak pernah dipertaruhkan, kenapa Monad (puluhan tx/menit per meja, 300 ms block).
5. (10 s) Model bisnis: fee yield, kosmetik, Spotlight Round sponsor.

---

## 12. Checklist keamanan sebelum demo
- [ ] Invariant vault lulus (fuzz runs ≥ 10.000).
- [ ] `claim` tidak bisa di-pause; tidak ada fungsi admin yang bisa menarik principal user.
- [ ] GameManager tanpa approval/transfer token.
- [ ] Replay EIP-712 dicegah (nonce + deadline + chainId + verifying contract).
- [ ] Commit-reveal: hash mengikat `tableId, round, player`.
- [ ] Oracle: tolak harga basi (`MAX_AGE`), tolak harga ≤ 0.
- [ ] Gas limit eksplisit di semua tx backend.
- [ ] Private key hanya di `.env` (tidak di-commit), `.env.example` tersedia.
- [ ] Label "Testnet · simulasi" terlihat di semua layar.
