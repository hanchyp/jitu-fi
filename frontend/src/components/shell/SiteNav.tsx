"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Nav } from "./Nav";

/**
 * Routes that render their own floating nav inside a full-bleed hero, so the layout skips it.
 * The landing passes <Nav floating /> into its TitleScreen.
 * A new full-bleed route needs both: its path here AND <Nav floating /> rendered in its hero.
 * With only one, the page shows two navs or none.
 */
const FLOATING_NAV_ROUTES = new Set(["/"]);

function RoutedNav() {
  const pathname = usePathname();
  if (FLOATING_NAV_ROUTES.has(pathname)) return null;
  return <Nav current={pathname} />;
}

/**
 * The layout's nav. usePathname suspends during prerender on routes with unknown dynamic params
 * (cacheComponents), so the fallback is the same nav without an active link.
 */
export function SiteNav() {
  return (
    <Suspense fallback={<Nav />}>
      <RoutedNav />
    </Suspense>
  );
}
