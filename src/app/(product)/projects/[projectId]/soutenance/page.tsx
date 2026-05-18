import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel, formatPercent } from "@/lib/format/formatters";
import { calculateEarnedSchedule } from "@/services/advanced-planning";
import { getProjectView } from "@/services/projects";

export default async function ProjectSoutenancePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  const earnedSchedule = calculateEarnedSchedule(view);
  const sections = [
    "Tableau de bord projet",
    "Planning de reference vs actuel",
    "Courbe S",
    "Tableau des ecarts",
    "Points d'alerte et actions",
    "Ressources",
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/85 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Mode soutenance
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1a4a20]">
          Rapport marche public
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          PDF A4 en 6 pages avec jalons contractuels, chemin critique, courbe S et ressources.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/api/projects/${projectId}/reports?format=soutenance`}>Generer le PDF soutenance</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/projects/${projectId}/reports?format=gantt-svg`}>Export Gantt SVG</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/projects/${projectId}/reports?format=excel`}>Export Excel multi-onglets</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sommaire PDF</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {sections.map((section, index) => (
              <div key={section} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Page {index + 1}
                </div>
                <div className="mt-1 font-semibold text-slate-950">{section}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donnees courantes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3"><span>Avancement</span><strong>{formatPercent(view.metrics.overallProgress)}</strong></div>
            <div className="flex justify-between gap-3"><span>Fin previsionnelle</span><strong>{formatDateLabel(view.schedule.projectFinishDate)}</strong></div>
            <div className="flex justify-between gap-3"><span>Fin contractuelle</span><strong>{formatDateLabel(view.aggregate.project.targetFinishDate)}</strong></div>
            <div className="flex justify-between gap-3"><span>SPI_t</span><strong>{earnedSchedule.SPI_t?.toFixed(2) ?? "n/a"}</strong></div>
            <div className="flex justify-between gap-3"><span>Chemin critique</span><strong>{view.metrics.criticalTaskCount}</strong></div>
            <div className="flex justify-between gap-3"><span>Surcharges</span><strong>{view.metrics.overloadedResourceCount}</strong></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

