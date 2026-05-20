import type { ReactNode } from "react";

// All product pages are fully dynamic — no static pre-rendering at build time.
// This avoids concurrent DB writes (unique constraint races) on Vercel.
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app/app-shell";
import { GUEST_SESSION } from "@/services/auth";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <AppShell session={GUEST_SESSION}>{children}</AppShell>;
}
