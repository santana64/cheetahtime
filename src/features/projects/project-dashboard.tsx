import { MetricCard } from "@/components/app/metric-card";
import {
  PriorityBadge,
  ProjectHealthBadge,
  TaskStatusBadge,
} from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateLabel, formatPercent } from "@/lib/format/formatters";
import type { ProjectView } from "@/types/planning";
import { ProjectCalendarForm } from "@/features/projects/project-calendar-form";
import { ProjectMetadataForm } from "@/features/projects/project-metadata-form";
import { ProjectOperationsPanel } from "@/features/projects/project-operations-panel";
import { ActualCostLedgerPanel } from "@/features/projects/actual-cost-ledger-panel";
import { cn } from "@/lib/utils";
import { calculateBridgeCostImpact } from "@/services/cost-bridge";

/* ─── Small cheetah rosette ornament ─────────────────────────── */
function RosetteAccent({ delay = "delay-0" }: { delay?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 animate-rosette-bloom", delay)}
      aria-hidden="true"
    >
      <span className="block size-2.5 rounded-full" style={{ background: "oklch(0.555 0.155 145)" }} />
      <span className="block size-1.5 rounded-full" style={{ background: "oklch(0.670 0.172 52)" }} />
      <span className="block size-2 rounded-full"   style={{ background: "oklch(0.555 0.155 145)" }} />
    </span>
  );
}

/* ─── Section label (shimmer eyebrow) ────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="shimmer-text text-[10px] font-bold uppercase tracking-[0.22em]">
      {children}
    </div>
  );
}

/* ─── Inline stat row (label / value) ────────────────────────── */
/* ─── Livraison stat block ────────────────────────────────────── */
function DeliveryStat({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  delay?: number;
}) {
  return (
    <div
      className="elite-lift rounded-xl border border-border/40 bg-gradient-to-br from-white to-[oklch(0.975_0.008_145_/_0.30)] p-4 animate-velocity-enter"
      style={{ animationDelay: `${delay}ms` }}
    >
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-2 text-[22px] font-bold leading-none text-slate-950 animate-count-pop">
        {value}
      </div>
      {sub && <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{sub}</p>}
    </div>
  );
}

export function ProjectDashboard({ view }: { view: ProjectView }) {
  const currency = view.aggregate.project.currencyCode;
  const bridgeCostImpact = calculateBridgeCostImpact(view);

  return (
    <div className="space-y-6">

      {/* ── KPI metric cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 animate-velocity-enter delay-0">
        {view.metrics.dashboardMetrics.map((metric, i) => (
          <div key={metric.label} style={{ animationDelay: `${i * 55}ms` }}>
            <MetricCard metric={metric} />
          </div>
        ))}
      </div>

      {/* ── EVM Earned Value Management ── */}
      {(view.metrics.earnedValue != null || view.metrics.plannedValue != null) && (
        <div className="rounded-2xl border border-white/60 bg-white/90 p-5 animate-velocity-enter delay-100">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Earned Value Management</div>
              <div className="mt-0.5 text-base font-black text-[#1a4a20]">Tableau de bord EVM</div>
            </div>
            <a href={`/projects/${view.aggregate.project.id}/analytics`}
              className="rounded-lg border border-[#1a4a20]/20 px-3 py-1.5 text-xs font-semibold text-[#1a4a20] hover:bg-[#1a4a20]/5 transition-colors">
              Analyse complète →
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                key: "BCWS (VP)",
                value: view.metrics.plannedValue != null ? formatCurrency(view.metrics.plannedValue, currency) : "—",
                sub: "Valeur Planifiée",
                color: "#94a3b8",
                bg: "bg-slate-50",
              },
              {
                key: "BCWP (VA)",
                value: view.metrics.earnedValue != null ? formatCurrency(view.metrics.earnedValue, currency) : "—",
                sub: "Valeur Acquise",
                color: "#1a4a20",
                bg: "bg-emerald-50/60",
              },
              {
                key: "ACWP (CA)",
                value: formatCurrency(view.metrics.totalActualCost, currency),
                sub: "Coût Réel",
                color: "#7c3aed",
                bg: "bg-violet-50/60",
              },
              {
                key: "CPI",
                value: view.metrics.costPerformanceIndex != null ? view.metrics.costPerformanceIndex.toFixed(2) : "—",
                sub: "Indice Perf. Coût",
                color: (view.metrics.costPerformanceIndex ?? 1) >= 1 ? "#15803d" : (view.metrics.costPerformanceIndex ?? 1) >= 0.9 ? "#b45309" : "#b91c1c",
                bg: (view.metrics.costPerformanceIndex ?? 1) >= 1 ? "bg-emerald-50" : (view.metrics.costPerformanceIndex ?? 1) >= 0.9 ? "bg-amber-50" : "bg-rose-50",
              },
              {
                key: "SPI",
                value: view.metrics.schedulePerformanceIndex != null ? view.metrics.schedulePerformanceIndex.toFixed(2) : "—",
                sub: "Indice Perf. Délai",
                color: (view.metrics.schedulePerformanceIndex ?? 1) >= 1 ? "#15803d" : (view.metrics.schedulePerformanceIndex ?? 1) >= 0.9 ? "#b45309" : "#b91c1c",
                bg: (view.metrics.schedulePerformanceIndex ?? 1) >= 1 ? "bg-emerald-50" : (view.metrics.schedulePerformanceIndex ?? 1) >= 0.9 ? "bg-amber-50" : "bg-rose-50",
              },
            ].map(({ key, value, sub, color, bg }) => (
              <div key={key} className={`rounded-xl border border-white/60 ${bg} p-4`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{key}</div>
                <div className="mt-2 text-xl font-black" style={{ color }}>{value}</div>
                <div className="mt-1 text-[10px] text-slate-500">{sub}</div>
                {(key === "CPI" || key === "SPI") && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((key === "CPI" ? view.metrics.costPerformanceIndex : view.metrics.schedulePerformanceIndex) ?? 0) * 100))}%`,
                        background: color,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {(view.metrics.estimateAtCompletion != null || view.metrics.varianceAtCompletion != null) && (
            <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-slate-50/80 px-4 py-3 text-sm">
              {view.metrics.estimateAtCompletion != null && (
                <span className="text-slate-600">
                  EAC (Prévision à terminaison) :{" "}
                  <strong className="text-slate-900">{formatCurrency(view.metrics.estimateAtCompletion, currency)}</strong>
                </span>
              )}
              {view.metrics.varianceAtCompletion != null && (
                <span className={view.metrics.varianceAtCompletion >= 0 ? "text-emerald-700" : "text-rose-600"}>
                  VAC (Ecart à terminaison) :{" "}
                  <strong>{formatCurrency(view.metrics.varianceAtCompletion, currency)}</strong>
                </span>
              )}
              {view.metrics.earnedValueCostVariance != null && (
                <span className="text-slate-600">
                  CV (Ecart coût) :{" "}
                  <strong className={view.metrics.earnedValueCostVariance >= 0 ? "text-emerald-700" : "text-rose-600"}>
                    {formatCurrency(view.metrics.earnedValueCostVariance, currency)}
                  </strong>
                </span>
              )}
              {view.metrics.earnedValueScheduleVariance != null && (
                <span className="text-slate-600">
                  SV (Ecart délai) :{" "}
                  <strong className={view.metrics.earnedValueScheduleVariance >= 0 ? "text-emerald-700" : "text-rose-600"}>
                    {formatCurrency(view.metrics.earnedValueScheduleVariance, currency)}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <div className="space-y-6">

          {/* ══ LIVRAISON DU PROJET ══════════════════════════════ */}
          <Card className="elite-lift holo-surface overflow-hidden border-white/60 bg-white/95 animate-velocity-enter delay-100">
            {/* Top accent bar */}
            <div
              className="h-[2.5px] w-full animate-gradient-x"
              style={{
                background: "linear-gradient(90deg, oklch(0.355 0.118 145) 0%, oklch(0.555 0.155 145) 35%, oklch(0.670 0.172 52) 65%, oklch(0.355 0.118 145) 100%)",
                backgroundSize: "200% 100%",
              }}
            />

            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-2.5">
                <RosetteAccent delay="delay-150" />
                <CardTitle className="gradient-text text-xl animate-hunt-focus delay-100">
                  Livraison du projet
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 pb-5 md:grid-cols-2 xl:grid-cols-3">
              <DeliveryStat
                label="Budget"
                value={formatCurrency(view.aggregate.project.budgetAmount, currency)}
                sub={`Portefeuille\u00a0: ${view.aggregate.project.portfolio}`}
                delay={120}
              />
              <DeliveryStat
                label="Coût planifié"
                value={formatCurrency(view.metrics.totalPlannedCost, currency)}
                sub={`Écart référentiel\u00a0: ${formatCurrency(view.metrics.baselineCostVariance ?? 0, currency)}`}
                delay={165}
              />
              <DeliveryStat
                label="Coût réel"
                value={formatCurrency(view.metrics.totalActualCost, currency)}
                sub={`${view.metrics.totalActualWorkHours.toFixed(1)}h réalisées / ${view.metrics.totalRemainingWorkHours.toFixed(1)}h restantes`}
                delay={210}
              />
              <DeliveryStat
                label="Impact glissement -> cout"
                value={`+${formatCurrency(bridgeCostImpact.totalCostImpact, currency)}`}
                sub={bridgeCostImpact.narrative}
                delay={235}
              />
              <DeliveryStat
                label="Avancement global"
                value={formatPercent(view.metrics.overallProgress)}
                sub={`${view.metrics.executableTaskCount} tâche(s) exécutable(s) dans le réseau`}
                delay={255}
              />
              <DeliveryStat
                label="Valeur acquise"
                value={
                  view.metrics.earnedValue != null
                    ? formatCurrency(view.metrics.earnedValue, currency)
                    : "Sans référentiel"
                }
                sub={
                  view.metrics.plannedValue != null
                    ? `VP\u00a0${formatCurrency(view.metrics.plannedValue, currency)} — CA\u00a0${formatCurrency(view.metrics.totalActualCost, currency)}`
                    : "Activez un référentiel pour débloquer la valeur acquise."
                }
                delay={300}
              />
              <DeliveryStat
                label="Référentiel actif"
                value={view.activeBaseline?.name ?? "Aucun"}
                sub={
                  view.activeBaseline
                    ? `Capturé le ${new Date(view.activeBaseline.capturedAt).toLocaleDateString("fr-FR")}`
                    : "Capturez un référentiel une fois la logique approuvée."
                }
                delay={345}
              />
              <DeliveryStat
                label="Profil de nivellement"
                value={`${view.metrics.totalLevelingDelayDays}j`}
                sub={`${view.metrics.leveledTaskCount} tâche(s) décalée(s) pour respecter les capacités`}
                delay={390}
              />
              <div
                className="elite-lift rounded-xl border border-border/40 bg-gradient-to-br from-white to-[oklch(0.975_0.008_145_/_0.30)] p-4 animate-velocity-enter"
                style={{ animationDelay: "435ms" }}
              >
                <SectionLabel>Santé du moteur</SectionLabel>
                <div className="mt-2 animate-rosette-bloom delay-500">
                  <ProjectHealthBadge health={view.metrics.derivedHealth} />
                </div>
                {view.metrics.healthReasons[0] && (
                  <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                    {view.metrics.healthReasons[0]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ══ CHEMIN CRITIQUE + JALONS ═════════════════════════ */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Chemin critique */}
            <Card className="elite-lift holo-surface overflow-hidden border-white/60 bg-white/95 animate-velocity-enter delay-200">
              <div className="h-[2px] w-full" style={{ background: "oklch(0.54 0.20 24 / 0.70)" }} />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center gap-2">
                  <span className="block size-2 rounded-full animate-paw-ripple" style={{ background: "oklch(0.54 0.20 24)" }} />
                  <CardTitle className="text-base font-bold text-slate-900 animate-hunt-focus delay-200">
                    Chemin critique
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pb-5">
                {view.metrics.criticalTasks.slice(0, 6).map((task, i) => (
                  <div
                    key={task.id}
                    className="group/task rounded-xl border border-border/50 bg-gradient-to-r from-slate-50 to-rose-50/30 p-3.5 transition-all duration-200 hover:border-rose-200/60 hover:shadow-sm animate-blur-reveal"
                    style={{ animationDelay: `${220 + i * 60}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block size-1.5 rounded-full shrink-0" style={{ background: "oklch(0.54 0.20 24)" }} />
                          <div className="truncate text-[13px] font-semibold text-slate-900">
                            {task.wbsCode} {task.name}
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatDateLabel(task.scheduledStartDate)} → {formatDateLabel(task.scheduledFinishDate)}
                        </div>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PriorityBadge priority={task.priority} />
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {task.totalSlackDays ?? 0}j slack
                      </span>
                      {task.levelingDelayDays > 0 && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          +{task.levelingDelayDays}j nivelé
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {view.metrics.criticalTasks.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">Aucune tâche critique détectée.</p>
                )}
              </CardContent>
            </Card>

            {/* Jalons à venir */}
            <Card className="elite-lift holo-surface overflow-hidden border-white/60 bg-white/95 animate-velocity-enter delay-250">
              <div
                className="h-[2px] w-full animate-gradient-x"
                style={{
                  background: "linear-gradient(90deg, oklch(0.670 0.172 52), oklch(0.555 0.155 145), oklch(0.670 0.172 52))",
                  backgroundSize: "200% 100%",
                }}
              />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center gap-2">
                  <span className="block size-2 rounded-full animate-paw-ripple delay-100" style={{ background: "oklch(0.670 0.172 52)" }} />
                  <CardTitle className="text-base font-bold text-slate-900 animate-hunt-focus delay-250">
                    Jalons à venir
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pb-5">
                {view.metrics.nearMilestones.length ? (
                  view.metrics.nearMilestones.map((task, i) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border/50 bg-gradient-to-r from-slate-50 to-orange-50/30 p-3.5 animate-slide-spring"
                      style={{ animationDelay: `${270 + i * 60}ms` }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1 block size-1.5 shrink-0 rounded-full" style={{ background: "oklch(0.670 0.172 52)" }} />
                        <div>
                          <div className="text-[13px] font-semibold text-slate-900">
                            {task.wbsCode} {task.name}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Prévu le {formatDateLabel(task.scheduledFinishDate)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Critique\u00a0: {task.isCritical ? "Oui" : "Non"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-slate-400">
                    Aucun jalon dans les 10 prochains jours ouvrés.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ══ SIGNAUX DE VARIANCE ══════════════════════════════ */}
          <Card className="elite-lift holo-surface overflow-hidden border-white/60 bg-white/95 animate-velocity-enter delay-300">
            <div
              className="h-[2px] w-full animate-gradient-x"
              style={{
                background: "linear-gradient(90deg, oklch(0.47 0.11 258), oklch(0.555 0.155 145), oklch(0.670 0.172 52), oklch(0.555 0.155 145), oklch(0.47 0.11 258))",
                backgroundSize: "300% 100%",
              }}
            />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-2.5">
                <RosetteAccent delay="delay-350" />
                <CardTitle className="gradient-text text-base font-bold animate-hunt-focus delay-300">
                  Signaux de variance
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              {/* Health outlook block */}
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-slate-50 to-[oklch(0.972_0.012_145_/_0.25)] p-4 animate-blur-reveal delay-350">
                <div className="text-[12px] font-bold text-slate-700">
                  Perspective calendaire dérivée
                </div>
                <div className="mt-2 animate-rosette-bloom delay-400">
                  <ProjectHealthBadge health={view.metrics.derivedHealth} />
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {view.metrics.healthReasons.map((reason) => (
                    <div key={reason} className="flex items-start gap-2">
                      <span className="mt-1 block size-1.5 shrink-0 rounded-full" style={{ background: "oklch(0.555 0.155 145 / 0.60)" }} />
                      {reason}
                    </div>
                  ))}
                </div>
                {(view.metrics.schedulePerformanceIndex != null || view.metrics.costPerformanceIndex != null) && (
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-white/60 p-3 text-[11px]">
                    {[
                      ["SPI", view.metrics.schedulePerformanceIndex?.toFixed(2) ?? "—"],
                      ["ICP", view.metrics.costPerformanceIndex?.toFixed(2) ?? "—"],
                      ["EAC", view.metrics.estimateAtCompletion != null ? formatCurrency(view.metrics.estimateAtCompletion, currency) : "—"],
                      ["VAC", view.metrics.varianceAtCompletion != null ? formatCurrency(view.metrics.varianceAtCompletion, currency) : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-400">{k}</span>
                        <span className="font-semibold text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task variance table */}
              {view.tasks
                .filter((task) => !task.isSummary)
                .slice(0, 8)
                .map((task, i) => {
                  const variance = view.baselineVarianceByTaskId[task.id];
                  const hasVariance = variance?.startVarianceDays || variance?.finishVarianceDays;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-xl border p-3.5 animate-blur-reveal",
                        hasVariance
                          ? "border-amber-200/50 bg-gradient-to-r from-amber-50/40 to-white"
                          : "border-border/50 bg-slate-50/60",
                      )}
                      style={{ animationDelay: `${370 + i * 45}ms` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {hasVariance && (
                              <span className="block size-1.5 shrink-0 rounded-full" style={{ background: "oklch(0.62 0.15 58)" }} />
                            )}
                            <div className="text-[12px] font-semibold text-slate-900">
                              {task.wbsCode} {task.name}
                            </div>
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            Référentiel\u00a0: {variance?.snapshot ? "disponible" : "non capturé"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                        <span>Début <span className="font-semibold text-slate-800">{variance?.startVarianceDays ?? 0}j</span></span>
                        <span>Fin <span className="font-semibold text-slate-800">{variance?.finishVarianceDays ?? 0}j</span></span>
                        <span>Charge <span className="font-semibold text-slate-800">{variance?.workVarianceHours ?? 0}h</span></span>
                        <span>Coût <span className="font-semibold text-slate-800">{formatCurrency(variance?.costVariance ?? 0, currency)}</span></span>
                        <span>VA <span className="font-semibold text-slate-800">{formatCurrency(variance?.earnedValue ?? 0, currency)}</span></span>
                        <span>CA <span className="font-semibold text-slate-800">{formatCurrency(variance?.actualCost ?? 0, currency)}</span></span>
                        <span>IPS <span className="font-semibold text-slate-800">{variance?.schedulePerformanceIndex?.toFixed(2) ?? "—"}</span></span>
                        <span>Nivellement <span className="font-semibold text-slate-800">{task.levelingDelayDays ? `+${task.levelingDelayDays}j` : "aucun"}</span></span>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>

        {/* ══ PANNEAU LATÉRAL ══════════════════════════════════ */}
        <div className="space-y-5 animate-velocity-enter delay-400">
          <ProjectMetadataForm view={view} />
          <ProjectCalendarForm view={view} />
          <ProjectOperationsPanel view={view} />
          <ActualCostLedgerPanel view={view} />
        </div>
      </div>
    </div>
  );
}
