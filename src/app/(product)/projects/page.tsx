import Link from "next/link";
import { Plus } from "lucide-react";

import {
  ProjectHealthBadge,
  ProjectOriginBadge,
  ProjectStatusBadge,
} from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { levelWorkspaceResourcesAction } from "@/features/projects/actions";
import { ProjectImportPanel } from "@/features/projects/project-import-panel";
import { formatCurrency, formatDateLabel, formatPercent } from "@/lib/format/formatters";
import { getPersistenceInfo } from "@/services/project-store";
import { listProjectViews } from "@/services/projects";
import { requireCurrentSession } from "@/services/auth";
import { cn } from "@/lib/utils";

export default async function ProjectsPage() {
  const session = await requireCurrentSession();
  const views = await listProjectViews({
    includeArchived: true,
    workspaceId: session.workspaceId,
  });
  const persistence = getPersistenceInfo();
  const activeViews = views.filter((v) => !v.aggregate.project.archivedAt);
  const archivedViews = views.filter((v) => v.aggregate.project.archivedAt);
  const derivedRiskCount = views.filter(
    (v) =>
      v.metrics.derivedHealth === "AT_RISK" ||
      v.metrics.derivedHealth === "OFF_TRACK",
  ).length;

  return (
    <div className="space-y-6">

      {/* ── Page header — dark hero Cheetah Time ── */}
      <div
        className="relative overflow-hidden rounded-2xl animate-velocity-enter"
        style={{
          background: "linear-gradient(135deg, #1a4a20 0%, #0e2714 50%, #0d1f10 100%)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(86,164,91,0.18)",
          border: "1px solid rgba(86,164,91,0.18)",
          padding: "24px 28px",
        }}
      >
        {/* Speed lines */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true"
          style={{ backgroundImage: "repeating-linear-gradient(-62deg, transparent, transparent 38px, rgba(255,255,255,0.022) 38px, rgba(255,255,255,0.022) 39px)" }} />
        {/* Blobs ambiants */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full" aria-hidden="true"
          style={{ background: "radial-gradient(circle, rgba(244,163,33,0.12) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute -left-8 bottom-0 size-36 rounded-full" aria-hidden="true"
          style={{ background: "radial-gradient(circle, rgba(86,164,91,0.16) 0%, transparent 70%)" }} />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: "rgba(86,164,91,0.75)" }}>
              Portefeuille
            </div>
            <h1 className="mt-1 text-[26px] font-black text-white animate-hunt-focus delay-75" style={{ letterSpacing: "-0.025em" }}>
              Portefeuille de projets
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-5" style={{ color: "rgba(255,255,255,0.48)" }}>
              Plans actifs, archives et signaux d&apos;ordonnancement calculés — tout en un seul tableau de bord opérationnel.
            </p>
            {/* Séparateur */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-[2px] w-8 rounded-full" style={{ background: "#56a45b" }} />
              <div className="h-[2px] w-4 rounded-full" style={{ background: "#f4a321" }} />
              <div className="h-[2px] w-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
          </div>
          <Button asChild className="shrink-0 animate-rosette-bloom delay-200" style={{
            background: "linear-gradient(135deg, #56a45b, #3f8f48)",
            boxShadow: "0 4px 20px rgba(86,164,91,0.40)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
          }}>
            <Link href="/projects/new">
              <Plus className="size-4" />
              Nouveau projet
            </Link>
          </Button>
          <form action={levelWorkspaceResourcesAction}>
            <Button type="submit" variant="outline" className="shrink-0 bg-white/10 text-white hover:bg-white/20">
              Nivellement portefeuille
            </Button>
          </form>
        </div>
      </div>

      {/* ── Portfolio KPI summary ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Projets actifs",
            value: activeViews.length,
            color: "oklch(0.355 0.118 145)",
            bg: "oklch(0.925 0.030 145 / 0.50)",
            delay: "delay-0",
          },
          {
            label: "Archivé",
            value: archivedViews.length,
            color: "oklch(0.455 0.016 220)",
            bg: "transparent",
            delay: "delay-75",
          },
          {
            label: "Risque calculé",
            value: derivedRiskCount,
            color: derivedRiskCount > 0 ? "oklch(0.54 0.20 24)" : "oklch(0.455 0.016 220)",
            bg: derivedRiskCount > 0 ? "oklch(0.96 0.05 24 / 0.25)" : "transparent",
            sub: "signalé par le moteur",
            delay: "delay-150",
          },
          {
            label: "Référentiels actifs",
            value: views.filter((v) => v.activeBaseline).length,
            color: "oklch(0.670 0.172 52)",
            bg: "oklch(0.962 0.024 58 / 0.40)",
            delay: "delay-225",
          },
        ].map(({ label, value, color, bg, sub, delay }) => (
          <div
            key={label}
            className={cn("elite-lift holo-surface rounded-xl p-4 animate-velocity-enter", delay)}
            style={{ background: bg || undefined }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {label}
            </div>
            <div
              className="mt-2 text-[30px] font-bold tabular-nums leading-none animate-count-pop"
              style={{ color }}
            >
              {value}
            </div>
            {sub && (
              <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Persistence mode notice ── */}
      <Card
        className="border-dashed bg-white/50 shadow-none"
        style={{ borderColor: "oklch(0.880 0.011 85 / 0.60)" }}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Mode de persistance
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {persistence.label}
            </div>
            <div className="mt-0.5 max-w-xl text-xs text-slate-500">
              {persistence.description}
            </div>
          </div>
          <div
            className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={
              persistence.mode === "prisma"
                ? { background: "oklch(0.925 0.030 145)", color: "oklch(0.355 0.118 145)" }
                : { background: "oklch(0.96 0.065 58 / 0.40)", color: "oklch(0.530 0.172 52)" }
            }
          >
            {persistence.mode === "prisma" ? "Base de données" : "Données locales"}
          </div>
        </CardContent>
      </Card>

      {/* ── Active portfolio ── */}
      <ProjectImportPanel />

      <section className="space-y-4 animate-velocity-enter delay-300">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Rosette decoration */}
            <span className="flex items-center gap-1 animate-rosette-bloom delay-350" aria-hidden="true">
              <span className="block size-2.5 rounded-full" style={{ background: "oklch(0.555 0.155 145)" }} />
              <span className="block size-1.5 rounded-full" style={{ background: "oklch(0.670 0.172 52)" }} />
              <span className="block size-2 rounded-full" style={{ background: "oklch(0.555 0.155 145)" }} />
            </span>
            <div>
              <h2 className="gradient-text text-xl font-bold animate-hunt-focus delay-350">Portefeuille actif</h2>
              <p className="text-xs text-slate-500">
                Projets en cours dans le réseau d&apos;ordonnancement actif.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {activeViews.map((view, i) => {
            const health = view.metrics.derivedHealth;
            const isAtRisk = health === "AT_RISK" || health === "OFF_TRACK";
            const cardDelays = ["delay-50", "delay-150", "delay-250", "delay-350", "delay-450", "delay-550"];
            const delayClass = cardDelays[i % cardDelays.length];
            return (
              <Card
                key={view.aggregate.project.id}
                className={cn(
                  "group flex flex-col elite-lift aurora-card animate-velocity-enter",
                  isAtRisk ? "border-rose-200/50" : "",
                  delayClass,
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Top accent bar */}
                <div
                  className="h-[2px] w-full rounded-t-2xl animate-gradient-x"
                  style={{
                    background: isAtRisk
                      ? "oklch(0.54 0.20 24)"
                      : "linear-gradient(90deg, oklch(0.355 0.118 145) 0%, oklch(0.670 0.172 52) 50%, oklch(0.355 0.118 145) 100%)",
                    backgroundSize: "200% 100%",
                  }}
                />

                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ProjectStatusBadge status={view.aggregate.project.status} />
                    <ProjectHealthBadge health={view.aggregate.project.health} />
                    <ProjectOriginBadge origin={view.aggregate.project.origin} />
                  </div>
                  <CardTitle className="mt-1 text-[15px] leading-snug truncate">
                    {view.aggregate.project.name}
                  </CardTitle>
                  <p className="text-xs leading-5 text-slate-500 line-clamp-2">
                    {view.aggregate.project.description}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  {/* Key metrics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Avancement",
                        value: formatPercent(view.metrics.overallProgress),
                        color: "oklch(0.355 0.118 145)",
                      },
                      {
                        label: "Fin prévisionnelle",
                        value: formatDateLabel(view.schedule.projectFinishDate),
                        color: "oklch(0.155 0.022 230)",
                        small: true,
                      },
                      {
                        label: "Tâches critiques",
                        value: String(view.metrics.criticalTaskCount),
                        color:
                          view.metrics.criticalTaskCount > 0
                            ? "oklch(0.54 0.20 24)"
                            : "oklch(0.155 0.022 230)",
                      },
                      {
                        label: "Ressources",
                        value: String(view.aggregate.resources.length),
                        color: "oklch(0.670 0.172 52)",
                      },
                    ].map(({ label, value, color, small }) => (
                      <div
                        key={label}
                        className="rounded-lg border px-3 py-2.5"
                        style={{
                          borderColor: "oklch(0.880 0.011 85 / 0.40)",
                          background: "oklch(0.978 0.008 85 / 0.60)",
                        }}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          {label}
                        </div>
                        <div
                          className={cn(
                            "mt-1 font-bold tabular-nums leading-none animate-count-pop",
                            small ? "text-[14px]" : "text-[20px]",
                          )}
                          style={{ color }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary snapshot */}
                  <div
                    className="gradient-border space-y-1.5 rounded-lg border px-3 py-3"
                    style={{
                      borderColor: "oklch(0.880 0.011 85 / 0.40)",
                      background: "oklch(0.978 0.008 85 / 0.50)",
                    }}
                  >
                    {[
                      {
                        key: "Budget",
                        value: formatCurrency(
                          view.aggregate.project.budgetAmount,
                          view.aggregate.project.currencyCode,
                        ),
                      },
                      { key: "Responsable", value: view.aggregate.project.ownerName },
                      {
                        key: "Référentiel",
                        value: view.activeBaseline?.name ?? "Non capturé",
                      },
                    ].map(({ key, value }) => (
                      <div key={key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400">{key}</span>
                        <span className="font-medium text-slate-700">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400">Moteur</span>
                      <span
                        className="font-bold"
                        style={{
                          color:
                            health === "ON_TRACK"
                              ? "oklch(0.52 0.14 148)"
                              : health === "WATCH"
                                ? "oklch(0.62 0.15 58)"
                                : "oklch(0.54 0.20 24)",
                        }}
                      >
                        {({"ON_TRACK":"En bonne voie","WATCH":"Surveillance","AT_RISK":"À risque","OFF_TRACK":"Hors délai"} as Record<string,string>)[health] ?? health}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/projects/${view.aggregate.project.id}/planning`}>
                        Planifier
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${view.aggregate.project.id}/dashboard`}>
                        Tableau de bord
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${view.aggregate.project.id}/resources`}>
                        Ressources
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Archived portfolio ── */}
      {archivedViews.length ? (
        <section className="space-y-4 animate-velocity-enter delay-500">
          <div>
            <h2 className="gradient-text text-xl font-bold animate-hunt-focus delay-500">Portefeuille archivé</h2>
            <p className="text-xs text-slate-500">
              Dossiers de planning conservés — exclus du tableau de bord actif.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {archivedViews.map((view) => (
              <Card key={view.aggregate.project.id} className="bg-white/70 opacity-80">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ProjectOriginBadge origin={view.aggregate.project.origin} />
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        borderColor: "oklch(0.880 0.011 85 / 0.55)",
                        background: "oklch(0.952 0.007 85)",
                        color: "oklch(0.455 0.016 220)",
                      }}
                    >
                      Archivé
                    </span>
                  </div>
                  <CardTitle className="mt-1 text-[14px] leading-snug">
                    {view.aggregate.project.name}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Archivé le{" "}
                    {new Date(view.aggregate.project.archivedAt!).toLocaleDateString("fr-FR")}{" "}
                    par {view.aggregate.project.archivedBy ?? view.aggregate.project.ownerName}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">Fin prévisionnelle</span>
                    <span className="font-medium text-slate-700">
                      {formatDateLabel(view.schedule.projectFinishDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">Référentiel actif</span>
                    <span className="font-medium text-slate-700">
                      {view.activeBaseline?.name ?? "Non capturé"}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${view.aggregate.project.id}/dashboard`}>
                      Ouvrir le dossier
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
