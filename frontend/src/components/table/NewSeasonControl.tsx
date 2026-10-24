"use client";

import { explorerTxUrl } from "@jitu-fi/shared";
import { useEffect, useState } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/lib/auth/session";
import { adminErrorMessage, adminPost } from "./admin-api";
import { isNewSeasonKey } from "./demo-shortcut";

type Tenor = "week" | "month";
type Created = { seasonId: number; hash: string; tenor: Tenor };
const TENORS: { id: Tenor; label: string }[] = [{ id: "week", label: "Week · 15 min" }, { id: "month", label: "Month · 30 min" }];

// Season managers: Shift+R on /play opens this. Nothing is sent until Create is pressed.
export function NewSeasonControl() {
  const { ensureToken } = useSession();
  const [open, setOpen] = useState(false);
  const [tenor, setTenor] = useState<Tenor>("week");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isNewSeasonKey(event, document)) return;
      event.preventDefault();
      setOpen(true); setError(""); setCreated(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  async function create() {
    if (pending) return;
    setPending(true); setError("");
    try { setCreated(await adminPost<Created>("/admin/seasons", { tenor }, ensureToken)); }
    catch (err) { setError(adminErrorMessage(err)); }
    finally { setPending(false); }
  }
  const close = () => { if (!pending) setOpen(false); };
  return <Modal open={open} onClose={close} title="New testnet season" footer={created
    ? <GameActionButton onClick={close}>Done</GameActionButton>
    : <><GameActionButton variant="night" onClick={close} disabled={pending}>Cancel</GameActionButton>
      <GameActionButton onClick={create} disabled={pending} aria-busy={pending}>{pending ? "Creating…" : "Create season"}</GameActionButton></>}>
    {created ? <p role="status">Season #{created.seasonId} ({created.tenor}) is open for enrollment. <a href={explorerTxUrl(created.hash)} target="_blank" rel="noreferrer" className="text-emas underline">View transaction</a></p> : <>
      <p>Opens a new Monad testnet season through the keeper: 2 minutes of enrollment, then the chosen length. Season-manager wallets only.</p>
      <p className="mt-2">Existing seasons are not reset. Old positions stay locked until their own maturity.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Season length">
        {TENORS.map((item) => <GameActionButton key={item.id} size="sm" variant={tenor === item.id ? "gold" : "night"} role="radio" aria-checked={tenor === item.id} disabled={pending} onClick={() => setTenor(item.id)}>{item.label}</GameActionButton>)}
      </div>
      {error && <p role="alert" className="mt-3 text-emas">{error}</p>}
    </>}
  </Modal>;
}
