import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartPreview } from "./ChartPreview";

export const metadata: Metadata = { title: "Chart preview · jitu.fi" };

// Dev-only preview of the price chart and sparklines with random-walk dummy prices.
export default function DevChartPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChartPreview />;
}
