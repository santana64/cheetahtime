import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/types/planning";

const TONE_CONFIG = {
  positive: {
    color:    "oklch(0.52 0.14 148)",
    glow:     "oklch(0.52 0.14 148 / 0.18)",
    gradient: "linear-gradient(180deg, oklch(0.58 0.16 148), oklch(0.40 0.13 148))",
    orb:      "oklch(0.65 0.14 148 / 0.12)",
    value:    "text-emerald-700",
    bg:       "bg-emerald-50/25",
    spark:    "#10b981",
  },
  watch: {
    color:    "oklch(0.68 0.16 55)",
    glow:     "oklch(0.68 0.16 55 / 0.16)",
    gradient: "linear-gradient(180deg, oklch(0.72 0.18 55), oklch(0.58 0.16 52))",
    orb:      "oklch(0.75 0.15 55 / 0.10)",
    value:    "text-amber-700",
    bg:       "bg-amber-50/25",
    spark:    "#f59e0b",
  },
  danger: {
    color:    "oklch(0.54 0.21 24)",
    glow:     "oklch(0.54 0.21 24 / 0.16)",
    gradient: "linear-gradient(180deg, oklch(0.60 0.22 24), oklch(0.44 0.20 24))",
    orb:      "oklch(0.66 0.18 24 / 0.10)",
    value:    "text-rose-700",
    bg:       "bg-rose-50/25",
    spark:    "#f43f5e",
  },
  neutral: {
    color:    "oklch(0.355 0.118 145)",
    glow:     "oklch(0.555 0.155 145 / 0.15)",
    gradient: "linear-gradient(180deg, oklch(0.555 0.155 145), oklch(0.355 0.118 145))",
    orb:      "oklch(0.62 0.13 145 / 0.10)",
    value:    "text-[oklch(0.280_0.09_145)]",
    bg:       "bg-[oklch(0.955_0.025_145)/20]",
    spark:    "oklch(0.555 0.155 145)",
  },
} as const;

type ToneKey = keyof typeof TONE_CONFIG;

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const key: ToneKey =
    metric.tone === "positive" ? "positive"
    : metric.tone === "watch"   ? "watch"
    : metric.tone === "danger"  ? "danger"
    : "neutral";

  const t = TONE_CONFIG[key];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl elite-lift holo-surface cursor-default",
        t.bg,
      )}
      style={{
        border: "1px solid oklch(0.880 0.011 85 / 0.65)",
        background: "white",
        boxShadow: `
          0 1px 3px rgba(22,101,52,0.04),
          0 6px 24px -8px rgba(22,101,52,0.08),
          0 1px 0 rgba(255,255,255,0.85) inset
        `,
      }}
    >
      {/* ── Gradient left accent bar ── */}
      <div
        className="absolute left-0 top-0 h-full w-[3.5px] rounded-r-full transition-all duration-300 group-hover:w-[4.5px]"
        style={{ background: t.gradient }}
      />

      {/* ── Ambient corner glow (reveals on hover) ── */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600"
        style={{ background: t.orb }}
      />

      {/* ── Cheetah-spot micro-decoration ── */}
      <div className="pointer-events-none absolute right-3.5 top-3.5 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-400">
        <span
          className="block size-[5px] rounded-full animate-spot-1"
          style={{ background: t.spark }}
        />
        <span
          className="ml-3 block size-[3.5px] rounded-full animate-spot-2"
          style={{ background: t.spark }}
        />
        <span
          className="ml-1 block size-[3px] rounded-full animate-spot-3"
          style={{ background: t.spark }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex min-h-[104px] flex-col justify-between gap-1.5 p-4 pl-[18px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 transition-colors duration-200 group-hover:text-slate-500">
          {metric.label}
        </div>

        <div
          className={cn(
            "metric-value text-[32px] font-black tracking-[-0.025em] tabular-nums leading-none",
            t.value,
          )}
        >
          {metric.value}
        </div>

        {metric.hint ? (
          <div className="text-[11px] leading-4 text-slate-400">
            {metric.hint}
          </div>
        ) : null}
      </div>

      {/* ── Bottom shimmer line (slides in on hover) ── */}
      <div
        className="absolute bottom-0 left-0 h-[1.5px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.color}, transparent)`,
        }}
      />

      {/* ── Ring expand on mount ── */}
      <div
        className="pointer-events-none absolute -right-2 -top-2 size-12 rounded-full opacity-0 group-hover:opacity-100 animate-ring-expand"
        style={{ border: `1px solid ${t.color}` }}
      />
    </div>
  );
}
