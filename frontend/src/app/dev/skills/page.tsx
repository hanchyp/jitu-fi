import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { SkillsPreview } from "./SkillsPreview";
import { STATES } from "./states";

export const metadata: Metadata = { title: "Skills preview | jitu.fi" };

// Dev-only preview of the skill hand, target pickers and the six spells: /dev/skills?state=used&view=2d
export default function DevSkillsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="flex-1">
      <Suspense>
        <SkillsPreview />
      </Suspense>
      <DevStateBar states={STATES} />
    </main>
  );
}
