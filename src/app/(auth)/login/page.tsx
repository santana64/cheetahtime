import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/app/brand-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentSession } from "@/services/auth";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion securisee a Cheetah Time.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getCurrentSession();
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/projects";

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-[oklch(0.980_0.004_85)] px-5 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <div className="inline-flex rounded-2xl bg-[#0e2714] px-4 py-3">
            <BrandMark />
          </div>
          <div className="max-w-2xl">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#56a45b]">
              Espace beta securise
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[#102015]">
              Cheetah Time est maintenant protege par session et espace de travail.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Les surfaces portefeuille, planning, ressources, baselines, risques et rapports exigent une session active. Cette couche interne garde le produit utilisable sans dependance SaaS externe, tout en posant un vrai modele utilisateur/workspace dans Prisma.
            </p>
          </div>
          <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ["Session", "Cookie HTTP-only et expiration serveur"],
              ["Workspace", "Isolation logique par espace de travail"],
              ["Audit", "Actions reliees a l'utilisateur connecte"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#56a45b]/15 bg-white/70 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <Card className="border-white/70 bg-white/95 shadow-xl">
          <CardHeader>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Connexion
            </div>
            <CardTitle className="text-xl font-black text-[#1a4a20]">
              Acceder a Cheetah Time
            </CardTitle>
            <p className="text-sm text-slate-500">
              Authentifiez-vous pour modifier les plans, les couts et les donnees de controle.
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm nextPath={nextPath} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
