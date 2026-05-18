import { redirect } from "next/navigation";

import { clearSessionCookie, destroyCurrentSession } from "@/services/auth";

export async function GET() {
  await destroyCurrentSession();
  await clearSessionCookie();
  redirect("/login");
}
