import Image from "next/image";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body: string;
  /** Art from public/assets/landing (decorative, so alt is empty). */
  art?: string;
  /** Usually one GameButton saying what to do next. */
  action?: ReactNode;
  className?: string;
};

/** An empty screen is an invitation to act: art, one line on what is missing, one action. */
export function EmptyState({ title, body, art, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center px-4 py-10 text-center ${className}`}>
      {art && <Image src={art} alt="" width={256} height={256} sizes="112px" className="h-28 w-28" />}
      <h3 className="font-display mt-3 text-2xl text-gading">{title}</h3>
      <p className="mt-1 max-w-md font-semibold leading-relaxed text-white/70">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
