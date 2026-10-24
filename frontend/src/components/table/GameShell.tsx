import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./game-styles";

// The lobby uses the shared shell. The fixed game keeps its compact local HUD.
export function GameShell({ children, game = false }: { children: ReactNode; game?: boolean }) {
  if (!game) return <main className={`${styles.shell} jitu-game-sharedPage`}><div className={styles.main}>{children}</div></main>;
  return <div className={styles.shell} data-game={game}>
    <div className={styles.banner}>Testnet · simulation <span>— Dummy game. No real funds.</span></div>
    <nav className={styles.nav} aria-label="Game navigation">
      <Link href="/" aria-label="jitu.fi home" className={styles.brand}>
        <Image src="/brand/jitu-crest.webp" alt="" width={32} height={36} />
        <Image src="/brand/jitu-wordmark.webp" alt="" width={77} height={34} />
      </Link>
      <div className={styles.navLinks}><Link href="/">Home</Link><Link href="/play">Play</Link><span className={styles.demoBadge}>Demo challenger</span></div>
    </nav>
    <main className={styles.main}>{children}</main>
  </div>;
}
