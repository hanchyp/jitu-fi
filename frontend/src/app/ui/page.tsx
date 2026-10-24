import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitchenSink } from "./KitchenSink";

export const metadata: Metadata = {
  title: "UI kit | jitu.fi",
  robots: { index: false },
};

/** Development-only kitchen sink: every UI kit component in every state, on navy. */
export default function UiKitPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <KitchenSink />;
}
