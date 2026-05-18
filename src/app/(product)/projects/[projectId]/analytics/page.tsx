import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateLabel, formatPercent } from "@/lib/format/formatters";
import {
  buildProgressTrend,
  calculateEarnedSchedule,
  runMonteCarloSchedule,
} from "@/services/advanced-planning";
import { calculateBridgeCostImpact } from "@/services/cost-bridge";
import { getProjectView } from "@/services/projects";

function MonteCarloHistogram({
  histogram,
  p50,
  p80,
}: {
  histogram: ReturnType<typeof runMonteCarloSchedule>["histogram"];
  p50: string | null;
  p80: string | null;
}) {
  if (!histogram.length) {
    return <div className="py-8 text-center text-sm text-slate-400">Données insuffisantes pour l'histogramme.</div>;
  }
  const width = 900;
  const height = 200;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const barW = Math.max(2, Math.floor((width - padL - padR) / histogram.length) - 1);
  const maxProb = Math.max(...histogram.map((b) => b.probability), 0.01);

  const bx = (i: number) => padL + i * ((width - padL - padR) / histogram.length);
  const by = (prob: number) => padT + (1 - prob / maxProb) * (height - padT - padB);

  const p50x = p50 ? bx(histogram.findIndex((b) => b.date >= p50)) : null;
  const p80x = p80 ? bx(histogram.findIndex((b) => b.date >= p80)) : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full">
      <rect width={width} height={height} fill="#fbfaf6" />
      {histogram.map((bar, i) => {
        const x = bx(i);
        const barHeight = Math.max(2, (bar.probability / maxProb) * (height - padT - padB));
        const isP50Zone = p50 && bar.date >= p50 && (!p80 || bar.date < p80);
        const isP80Zone = p80 && bar.date >= p80;
        return (
          <rect
            key={bar.date}
            x={x}
            y={by(bar.probability)}
            width={barW}
            height={barHeight}
            fill={isP80Zone ? "#fca5a5" : isP50Zone ? "#fcd34d" : "#86efac"}
            opacity={0.85}
          >
            <title>{`${bar.date} — ${(bar.probability * 100).toFixed(1)}%`}</title>
          </rect>
        );
      })}
      {p50x !== null && p50x >= 0 && (
        <>
          <line x1={p50x} x2={p50x} y1={padT} y2={height - padB} stroke="#d97706" strokeWidth="2" strokeDasharray="5 3" />
          <text x={p50x + 4} y={padT + 12} fontSize="11" fill="#d97706" fontWeight="bold">P50</text>
        </>
      )}
      {p80x !== null && p80x >= 0 && (
        <>
          <line x1={p80x} x2={p80x} y1={padT} y2={height - padB} stroke="#dc2626" strokeWidth="2" strokeDasharray="5 3" />
          <text x={p80x + 4} y={padT + 12} fontSize="11" fill="#dc2626" fontWeight="bold">P80</text>
        </>
      )}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const prob = tick * maxProb;
        const yPos = by(prob);
        return (
          <g key={tick}>
            <line x1={padL - 4} x2={padL} y1={yPos} y2={yPos} stroke="#cbd5e1" />
            <text x={padL - 6} y={yPos + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
              {(prob * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Scurve({ trends }: { trends: ReturnType<typeof buildProgressTrend> }) {
  const width = 900;
  const height = 300;
  const pad = 34;
  const x = (index: number) => pad + (index / Math.max(trends.length - 1, 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - (value / 100) * (height - pad * 2);
  const path = (key: "plannedProgress" | "actualProgress" | "forecastProgress") =>
    trends.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
      <rect width={width} height={height} fill="#fbfaf6" />
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={pad} x2={width - pad} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" />
          <text x={4} y={y(tick) + 4} fontSize="11" fill="#64748b">{tick}%</text>
        </g>
      ))}
      <path d={path("plannedProgress")} fill="none" stroke="#94a3b8" strokeWidth="3" />
      <path d={path("actualProgress")} fill="none" stroke="#1a4a20" strokeWidth="4" />
      <path d={path("forecastProgress")} fill="none" stroke="#f4a321" strokeWidth="3" strokeDasharray="8 6" />
      {trends.map((point, index) => (
        <circle key={point.date} cx={x(index)} cy={y(point.actualProgress)} r="4" fill="#1a4a20">
          <title>{`${point.date} - prevu ${point.plannedProgress}% / realise ${point.actualProgress}% / forecast ${point.forecastProgress}%`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  const earnedSchedule = calculateEarnedSchedule(view);
  const monteCarlo = runMonteCarloSchedule(view, undefined, 1500);
  const trends = buildProgressTrend(view);
  const costImpact = calculateBridgeCostImpact(view);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/85 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Scheduling avance
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1a4a20]">
          Earned Schedule, Monte Carlo et courbe S
        </h1>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["SPI_t", earnedSchedule.SPI_t?.toFixed(2) ?? "n/a"],
          ["IEAC_t", formatDateLabel(earnedSchedule.IEAC_t)],
          ["P80 client", formatDateLabel(monteCarlo.p80)],
          ["Impact cout", formatCurrency(costImpact.totalCostImpact, view.aggregate.project.currencyCode)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/70 bg-white/90 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="mt-2 text-xl font-black text-[#1a4a20]">{value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Courbe S interactive</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Survolez les points pour lire prevu / realise / forecast.</p>
          </div>
          <a className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700" href={`/api/projects/${projectId}/reports?format=s-curve-svg`}>
            Export SVG
          </a>
        </CardHeader>
        <CardContent>
          <Scurve trends={trends} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monte Carlo — {monteCarlo.iterations.toLocaleString("fr-FR")} simulations</CardTitle>
            <p className="text-xs text-slate-500">
              Distribution des dates de fin projet. <span className="font-semibold text-amber-600">Jaune = zone P50→P80</span> &nbsp;·&nbsp; <span className="font-semibold text-rose-500">Rouge = zone P80+</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <MonteCarloHistogram
              histogram={monteCarlo.histogram}
              p50={monteCarlo.p50}
              p80={monteCarlo.p80}
            />
            <div className="grid grid-cols-4 gap-2 text-sm">
              {[
                ["P10", monteCarlo.p10, "text-emerald-700 bg-emerald-50"],
                ["P50", monteCarlo.p50, "text-amber-700 bg-amber-50"],
                ["P80", monteCarlo.p80, "text-rose-600 bg-rose-50"],
                ["P90", monteCarlo.p90, "text-rose-800 bg-rose-100"],
              ].map(([label, date, cls]) => (
                <div key={label} className={`rounded-lg p-3 ${cls}`}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
                  <div className="mt-1 font-semibold">{formatDateLabel(date as string | null)}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Tâches les plus souvent sur le chemin critique</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {monteCarlo.criticalTasks.slice(0, 12).map((taskId) => {
                  const task = view.tasks.find((entry) => entry.id === taskId);
                  return (
                    <span key={taskId} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      {task ? `${task.wbsCode} ${task.name}` : taskId}
                    </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Earned Schedule</CardTitle>
            <p className="text-xs text-slate-500">Métrique temporelle complémentaire à l'EVM — prédit la date de fin réelle.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["ES (Earned Schedule)", `${earnedSchedule.ES} sem.`, earnedSchedule.ES > 0 ? "text-emerald-700" : "text-slate-600"],
              ["AT (Actual Time)", `${earnedSchedule.AT} sem.`, "text-slate-700"],
              ["SPI_t (perf. temporelle)", earnedSchedule.SPI_t != null ? earnedSchedule.SPI_t.toFixed(3) : "n/a", (earnedSchedule.SPI_t ?? 1) >= 1 ? "text-emerald-700 font-bold" : (earnedSchedule.SPI_t ?? 1) >= 0.9 ? "text-amber-700 font-bold" : "text-rose-600 font-bold"],
              ["IEAC_t (fin prévue ES)", formatDateLabel(earnedSchedule.IEAC_t), (earnedSchedule.predictedSlip ?? 0) === 0 ? "text-emerald-700" : "text-rose-600"],
              ["Glissement prédit", `${earnedSchedule.predictedSlip} j.`, earnedSchedule.predictedSlip === 0 ? "text-emerald-700" : "text-rose-600"],
              ["Avancement global", formatPercent(view.metrics.overallProgress), "text-slate-700"],
            ].map(([label, value, cls]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{label}</span>
                <strong className={cls as string}>{value}</strong>
              </div>
            ))}
            {costImpact.totalCostImpact > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {costImpact.narrative}
                {costImpact.costProjectUrl && (
                  <a href={costImpact.costProjectUrl} target="_blank" rel="noreferrer" className="ml-1 underline">
                    Voir dans Cheetah Cost →
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
