import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Preview } from "./Preview";

// Dev-only preview of <TableScene> with the fixture round: /dev/table-scene?phase=live&view=2d&state=forfeit
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
