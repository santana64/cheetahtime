"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import Image from "next/image";
import { BrandMark } from "@/components/app/brand-mark";
import { cn } from "@/lib/utils";
import type { AuthSession } from "@/services/auth";

const links = [
  { href: "/projects",     label: "Portefeuille" },
  { href: "/portfolio",    label: "Portfolio+" },
  { href: "/alerts",       label: "Alertes" },
  { href: "/reports",      label: "Rapports" },
  { href: "/api-docs",     label: "API" },
  { href: "/settings",     label: "Parametres" },
  { href: "/projects/new", label: "Nouveau projet" },
];

export function AppShell({ children, session }: { children: ReactNode; session: AuthSession }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 pb-10 pt-4 lg:px-8">

        {/* ── Navigation sombre — identité Cheetah Time ── */}
        <header className="sticky top-0 z-40 mb-6">
          <div
            className="relative flex items-center justify-between overflow-hidden rounded-xl px-4 py-2.5"
            style={{
              background: "linear-gradient(135deg, #1a4a20 0%, #0e2714 50%, #0d1f10 100%)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.22), " +
                "inset 0 1px 0 rgba(86,164,91,0.18), " +
                "inset 0 -1px 0 rgba(0,0,0,0.30)",
              border: "1px solid rgba(86,164,91,0.18)",
            }}
          >
            {/* Speed lines overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-62deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
              }}
            />

            {/* Ambient green blob top-left */}
            <div
              className="pointer-events-none absolute -left-10 -top-10 size-32 rounded-full"
              aria-hidden="true"
              style={{
                background: "radial-gradient(circle, rgba(86,164,91,0.18) 0%, transparent 70%)",
              }}
            />

            {/* Ambient orange blob top-right */}
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full"
              aria-hidden="true"
              style={{
                background: "radial-gradient(circle, rgba(244,163,33,0.12) 0%, transparent 70%)",
              }}
            />

            <BrandMark href="/projects" />

            <nav className="relative flex items-center gap-1">
              {links.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/projects/new" && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-200",
                      isActive
                        ? "text-white"
                        : "text-white/55 hover:bg-white/10 hover:text-white/85",
                    )}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(86,164,91,0.30) 0%, rgba(86,164,91,0.15) 100%)",
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.10), " +
                              "0 4px 12px rgba(0,0,0,0.18), " +
                              "0 0 16px rgba(86,164,91,0.12)",
                            border: "1px solid rgba(86,164,91,0.32)",
                          }
                        : { border: "1px solid transparent" }
                    }
                  >
                    {link.label}

                    {/* Active: barre vert→orange + point orange */}
                    {isActive && (
                      <>
                        <span
                          className="absolute bottom-[3px] left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
                          style={{
                            background: "linear-gradient(90deg, #56a45b, #f4a321)",
                            boxShadow: "0 0 6px rgba(244,163,33,0.50)",
                          }}
                        />
                          {/* Active left bar — signature Cheetah Time */}
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                          style={{
                            width: "3px",
                            height: "55%",
                            background: "linear-gradient(180deg, #f4a321, #56a45b)",
                            boxShadow: "0 0 8px rgba(244,163,33,0.55)",
                          }}
                        />
                      </>
                    )}
                  </Link>
                );
              })}
              <div
                className="ml-2 hidden rounded-lg border px-3 py-1.5 text-right text-[11px] leading-tight text-white/65 lg:block"
                style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}
              >
                <div className="font-bold text-white/85">{session.name}</div>
                <div>{session.workspaceName}</div>
              </div>
              <Link
                href="/logout"
                className="rounded-lg px-3 py-2 text-[13px] font-semibold text-white/55 transition-all duration-200 hover:bg-white/10 hover:text-white/85"
                style={{ border: "1px solid transparent" }}
              >
                Deconnexion
              </Link>
            </nav>
          </div>

          {/* Ligne de séparation vert→orange */}
          <div
            className="mx-4 h-px rounded-b-full opacity-40"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #56a45b 20%, #f4a321 50%, #56a45b 80%, transparent 100%)",
            }}
          />
        </header>

        <main className="flex-1 animate-velocity-enter">{children}</main>

        {/* ── Footer CheetahSoft ── */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <Image src="/cheetahsoft-logo.jpg" alt="CheetahSoft" width={40} height={40} style={{ borderRadius: "50%" }} />
            <div className="leading-none">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">CheetahSoft</div>
              <div className="text-[10px] text-white/35">Project Management Software</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/30">
            <span>Cheetah Time · Cheetah Cost</span>
            <span>·</span>
            <a href="/api/docs" className="hover:text-white/60 transition-colors">API</a>
            <a href="/settings" className="hover:text-white/60 transition-colors">Paramètres</a>
            <span>© {new Date().getFullYear()} CheetahSoft</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
