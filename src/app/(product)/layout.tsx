import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app/app-shell";
import { requireCurrentSession } from "@/services/auth";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await requireCurrentSession();
  return <AppShell session={session}>{children}</AppShell>;
}
