import { redirect } from "next/navigation";

// Auth is disabled — redirect any /login visit directly to the app
export default function LoginRedirect() {
  redirect("/projects");
}
