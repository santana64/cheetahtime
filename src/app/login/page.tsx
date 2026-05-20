import { redirect } from "next/navigation";

// Auth is disabled. Instantly bounce anyone who lands on /login back to the app.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  redirect("/projects");
}
