import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { GUEST_SESSION } from "@/services/auth";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <AppShell session={GUEST_SESSION}>{children}</AppShell>;
}
