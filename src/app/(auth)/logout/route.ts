import { redirect } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";

export async function GET() {
  await logoutAction();
  redirect("/login");
}
