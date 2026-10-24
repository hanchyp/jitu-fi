/** The required testnet strip at the top of every page. */
export function TestnetBanner() {
  return (
    <div className="relative z-30 border-b-[3px] border-garis bg-emas px-4 py-1.5 text-center text-sm font-extrabold text-garis">
      Testnet · simulation <span className="font-semibold opacity-75">Yield is simulated. No real funds.</span>
    </div>
  );
}
