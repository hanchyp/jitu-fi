import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillsPreview } from "./SkillsPreview";

export const metadata: Metadata = { title: "Skills preview · jitu.fi" };

export default function DevSkillsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SkillsPreview />;
}
