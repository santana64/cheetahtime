"use client";

import { useActionState } from "react";

import { loginAction } from "@/features/auth/actions";
import { initialFormState } from "@/features/projects/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialFormState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath || "/projects"} />

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Adresse e-mail
        <Input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue="admin@cheetahtime.local"
          required
          className="h-11"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Mot de passe
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue=""
          placeholder="Mot de passe de l'espace beta"
          required
          className="h-11"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        Code MFA
        <Input
          name="mfaCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000 si MFA active"
          className="h-11"
        />
      </label>

      {state.status !== "idle" ? (
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium",
            state.status === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700",
          )}
        >
          {state.message}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Identifiant beta par defaut: <strong>admin@cheetahtime.local</strong>. Le mot de passe se configure avec <code>CHEETAH_TIME_BOOTSTRAP_PASSWORD</code>; en local, la valeur de demonstration est <strong>CheetahTime!2026</strong>.
        </div>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
