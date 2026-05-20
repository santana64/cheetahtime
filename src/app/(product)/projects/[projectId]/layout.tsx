import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  ProjectHealthBadge,
  ProjectOriginBadge,
  ProjectStatusBadge,
} from "@/components/app/status-badge";
import { ProjectTabs } from "@/components/app/project-tabs";
import { AiAssistant } from "@/components/app/ai-assistant";
import { LiveRefresh } from "@/components/app/live-refresh";
import { formatDateLabel } from "@/lib/format/formatters";
import { getProjectView } from "@/services/projects";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => null);
  if (!view) return { title: "Project" };
  return {
    title: view.aggregate.project.name,
    description: `${view.aggregate.project.clientName} — ${view.aggregate.project.description}`,
  };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  const view = await getProjectView(projectId, { workspaceId: "workspace-cheetah-time" }).catch(() => notFound());
  const isArchived = Boolean(view.aggregate.project.archivedAt);

  return (
    <div className="space-y-5 animate-velocity-enter">
      {/* Project context bar — dark hero Cheetah Time */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          background: "linear-gradient(135deg, #1a4a20 0%, #0e2714 50%, #0d1f10 100%)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(86,164,91,0.18)",
          border: "1px solid rgba(86,164,91,0.18)",
        }}
      >
        {/* Speed lines */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-62deg, transparent, transparent 38px, rgba(255,255,255,0.022) 38px, rgba(255,255,255,0.022) 39px)",
          }}
        />
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(244,163,33,0.14) 0%, transparent 70%)" }}
          aria-hidden="true" />
        <div className="pointer-events-none absolute -left-8 bottom-0 size-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(86,164,91,0.16) 0%, transparent 70%)" }}
          aria-hidden="true" />
        {/* Top accent bar */}
        <div
          className="h-[3px] w-full animate-gradient-x"
          style={{
            background: "linear-gradient(90deg, #1a4a20, #56a45b, #f4a321, #56a45b, #1a4a20)",
            backgroundSize: "200% 100%",
          }}
        />
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-start xl:justify-between">
          {/* Identity */}
          <div className="relative min-w-0 space-y-2">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 animate-slide-spring delay-100">
              <ProjectStatusBadge status={view.aggregate.project.status} />
              <ProjectHealthBadge health={view.aggregate.project.health} />
              <ProjectOriginBadge origin={view.aggregate.project.origin} />
              {isArchived && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)", color: "rgba(255,255,255,0.70)" }}>
                  Archivé
                </span>
              )}
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.55)" }}>
                {view.aggregate.project.code}
              </span>
            </div>
            {/* Title */}
            <div>
              <h1 className="truncate text-2xl font-black tracking-tight text-white animate-hunt-focus delay-150" style={{ letterSpacing: "-0.025em" }}>
                {view.aggregate.project.name}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5" style={{ color: "rgba(255,255,255,0.50)" }}>
                {view.aggregate.project.description}
              </p>
            </div>
            {/* Sep */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="h-[2px] w-6 rounded-full" style={{ background: "#56a45b" }} />
              <div className="h-[2px] w-3 rounded-full" style={{ background: "#f4a321" }} />
            </div>
          </div>

          {/* Schedule meta */}
          <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:shrink-0">
            {[
              {
                label: "Début",
                value: formatDateLabel(view.aggregate.project.targetStartDate),
                delay: 0,
              },
              {
                label: "Fin prévisionnelle",
                value: formatDateLabel(view.schedule.projectFinishDate),
                emphasis: true,
                delay: 80,
              },
              {
                label: "Responsable",
                value: view.aggregate.project.ownerName,
                delay: 160,
              },
            ].map(({ label, value, emphasis, delay }) => (
              <div
                key={label}
                className="relative elite-lift animate-count-pop rounded-lg px-3 py-2 min-w-[100px]"
                style={{
                  animationDelay: `${delay}ms`,
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(86,164,91,0.20)",
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {label}
                </div>
                <div
                  className={cn(
                    "mt-1 text-sm font-bold",
                    emphasis ? "gradient-text" : "text-white",
                  )}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar: export + tabs */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-3 animate-slide-spring delay-200"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <ProjectTabs projectId={view.aggregate.project.id} dark />
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: "PDF", href: `/api/projects/${view.aggregate.project.id}/reports?format=pdf` },
              { label: "Excel", href: `/api/projects/${view.aggregate.project.id}/reports?format=excel` },
              { label: "CSV", href: `/api/projects/${view.aggregate.project.id}/reports?format=csv` },
              { label: "SVG Gantt", href: `/api/projects/${view.aggregate.project.id}/reports?format=gantt-svg` },
              { label: "JSON", href: `/api/projects/${view.aggregate.project.id}/export` },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                download
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                ↓ {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {children}

      {/* Live collaboration refresh (silent, 30s) */}
      <LiveRefresh projectId={view.aggregate.project.id} />
      {/* Floating AI assistant */}
      <AiAssistant projectId={view.aggregate.project.id} />
    </div>
  );
}
