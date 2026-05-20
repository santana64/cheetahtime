export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CalendarRange, Route, Target } from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import { MetricCard } from "@/components/app/metric-card";
import { ProjectHealthBadge, ProjectStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateLabel, formatPercent } from "@/lib/format/formatters";
import { listProjectViews } from "@/services/projects";

export default async function HomePage() {
  const views = await listProjectViews();
  const featured = views[0];

  return (
    <div
      className="relative min-h-screen speed-bg"
      style={{
        background:
          "radial-gradient(900px 480px at 8%  0%, rgba(86,164,91,0.13), transparent 55%), " +
          "radial-gradient(900px 480px at 92% 0%, rgba(244,163,33,0.10), transparent 55%), " +
          "linear-gradient(180deg, #f4f0e6 0%, #f5f2ea 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-6 py-0 lg:px-10">

        {/* ── Header sombre — identité Cheetah Time ── */}
        <header
          className="relative flex items-center justify-between overflow-hidden rounded-b-2xl px-6 py-4 animate-velocity-enter"
          style={{
            background: "linear-gradient(135deg, #1a4a20 0%, #0e2714 50%, #0d1f10 100%)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(86,164,91,0.18)",
            border: "1px solid rgba(86,164,91,0.18)",
            borderTop: "none",
          }}
        >
          {/* Speed lines */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-62deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
            }}
          />
          {/* Blobs ambiants */}
          <div className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(86,164,91,0.18) 0%, transparent 70%)" }}
            aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(244,163,33,0.12) 0%, transparent 70%)" }}
            aria-hidden="true" />

          <BrandMark href="/" />

          <Button asChild className="relative animate-rosette-bloom delay-200" style={{
            background: "linear-gradient(135deg, #56a45b, #3f8f48)",
            boxShadow: "0 4px 20px rgba(86,164,91,0.40)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <Link href="/projects">
              Ouvrir le produit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </header>

        {/* Ligne séparatrice */}
        <div
          className="mx-8 h-px opacity-40"
          style={{ background: "linear-gradient(90deg, transparent, #56a45b, #f4a321, #56a45b, transparent)" }}
        />

        {/* ── Hero ── */}
        <main className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.15fr)_560px]">

          {/* Gauche: copy */}
          <section className="space-y-8 animate-velocity-enter delay-50">

            {/* Eyebrow badge */}
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
              style={{
                background: "rgba(86,164,91,0.10)",
                border: "1px solid rgba(86,164,91,0.25)",
              }}
            >
              {/* Séparateur vert-orange miniature */}
              <span className="flex items-center gap-0.5">
                <span className="block h-[2px] w-3 rounded-full" style={{ background: "#56a45b" }} />
                <span className="block h-[2px] w-2 rounded-full" style={{ background: "#f4a321" }} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.20em]" style={{ color: "#3f8f48" }}>
                Planification de projet B2B premium
              </span>
            </div>

            {/* Titre */}
            <div className="space-y-4 animate-hunt-focus delay-75">
              <h1
                className="max-w-xl text-[52px] font-black leading-[1.04] tracking-tight text-slate-950 md:text-[60px]"
                style={{ letterSpacing: "-0.03em" }}
              >
                Un vrai logiciel de{" "}
                <span className="gradient-text">planning</span>{" "}
                pour les équipes sérieuses.
              </h1>
              <p className="max-w-lg text-[17px] leading-relaxed text-slate-600">
                Cheetah Time rassemble planification hiérarchique, vraie logique de dépendances,
                analyse du chemin critique, écarts de baseline et visibilité sur la charge ressource
                dans un espace web natif propre et dense.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button
                asChild size="lg"
                className="animate-rosette-bloom delay-250"
                style={{
                  background: "linear-gradient(135deg, #56a45b, #3f8f48)",
                  boxShadow: "0 4px 24px rgba(86,164,91,0.38)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                }}
              >
                <Link href="/projects">
                  Entrer dans le portefeuille
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="animate-rosette-bloom delay-350"
                style={{ borderColor: "rgba(86,164,91,0.35)", color: "#2a6b30" }}>
                <Link href={`/projects/${featured?.aggregate.project.id}/planning`}>
                  Ouvrir le planning
                </Link>
              </Button>
            </div>

            {/* Feature cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Route,
                  label: "Moteur de dépendances",
                  desc: "Logique FS, SS, FF, SF avec détection de cycles et analyse des marges.",
                  delay: 380,
                },
                {
                  icon: CalendarRange,
                  label: "Jours ouvrés",
                  desc: "Règles calendrier, exceptions, captures de baseline et dérive planning.",
                  delay: 450,
                },
                {
                  icon: Target,
                  label: "Pilotage de livraison",
                  desc: "Tâches critiques, radar jalons et pression ressource dans une seule vue.",
                  delay: 520,
                },
              ].map(({ icon: Icon, label, desc, delay }) => (
                <div
                  key={label}
                  className="aurora-card elite-lift rounded-xl p-4 animate-slide-spring"
                  style={{
                    animationDelay: `${delay}ms`,
                    background: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {/* Icône dans carré vert */}
                  <div
                    className="mb-2.5 flex size-8 items-center justify-center rounded-lg"
                    style={{
                      background: "rgba(86,164,91,0.12)",
                      border: "1px solid rgba(86,164,91,0.22)",
                    }}
                  >
                    <Icon className="size-4" style={{ color: "#3f8f48" }} />
                  </div>
                  <div className="text-[12.5px] font-bold text-slate-900">{label}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{desc}</div>
                  {/* Mini brand sep */}
                  <div className="mt-2.5 brand-sep" style={{ width: "28px", opacity: 0.40 }} />
                </div>
              ))}
            </div>
          </section>

          {/* Droite: carte projet vedette */}
          <section className="animate-scale-in delay-150">
            <div
              className="aurora-card overflow-hidden rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(0,0,0,0.09)",
                boxShadow: "0 35px 90px -30px rgba(15,23,42,0.28), 0 0 0 1px rgba(86,164,91,0.10)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-[3px] w-full animate-gradient-x"
                style={{
                  background:
                    "linear-gradient(90deg, #1a4a20, #56a45b, #f4a321, #56a45b, #1a4a20)",
                  backgroundSize: "200% 100%",
                }}
              />

              {featured && (
                <>
                  <div className="p-5 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ProjectStatusBadge status={featured.aggregate.project.status} />
                      <ProjectHealthBadge health={featured.aggregate.project.health} />
                    </div>
                    <h2 className="mt-2 text-[18px] font-black tracking-tight text-slate-950" style={{ letterSpacing: "-0.02em" }}>
                      {featured.aggregate.project.name}
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">
                      {featured.aggregate.project.description}
                    </p>
                    {/* Brand sep */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="h-[2px] w-8 rounded-full" style={{ background: "#56a45b" }} />
                      <div className="h-[2px] w-4 rounded-full" style={{ background: "#f4a321" }} />
                      <div className="h-[2px] w-2 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
                    </div>
                  </div>

                  <div className="px-5 pb-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {featured.metrics.dashboardMetrics.slice(0, 4).map((metric) => (
                        <MetricCard key={metric.label} metric={metric} />
                      ))}
                    </div>
                  </div>

                  {/* Table tâches */}
                  <div
                    className="mx-5 mb-5 rounded-xl p-4"
                    style={{
                      background: "rgba(244,240,230,0.60)",
                      border: "1px solid rgba(0,0,0,0.07)",
                    }}
                  >
                    <div
                      className="mb-3 grid grid-cols-[72px_minmax(0,1fr)_80px_80px] gap-2 text-[10px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: "rgba(15,23,42,0.45)" }}
                    >
                      <div>WBS</div>
                      <div>Tâche</div>
                      <div>Fin</div>
                      <div>Avancement</div>
                    </div>
                    <div className="space-y-2">
                      {featured.tasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="grid grid-cols-[72px_minmax(0,1fr)_80px_80px] items-center gap-2 rounded-lg px-2 py-2"
                          style={{
                            background: "rgba(255,255,255,0.70)",
                            border: "1px solid rgba(0,0,0,0.05)",
                          }}
                        >
                          <div className="text-[11px] font-semibold" style={{ color: "rgba(15,23,42,0.50)" }}>
                            {task.wbsCode}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-semibold text-slate-900">
                              {task.name}
                            </div>
                          </div>
                          <div className="text-[12px] text-slate-500">
                            {formatDateLabel(task.scheduledFinishDate)}
                          </div>
                          <div className="text-[12px] font-bold" style={{ color: "#3f8f48" }}>
                            {formatPercent(task.progressPercent)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Brand footer sous la carte */}
            <div className="mt-5 flex items-center justify-center gap-3 opacity-50">
              <div className="h-px w-10 rounded-full" style={{ background: "#56a45b" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                CheetahSoft · Planification
              </span>
              <div className="h-px w-10 rounded-full" style={{ background: "#f4a321" }} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
