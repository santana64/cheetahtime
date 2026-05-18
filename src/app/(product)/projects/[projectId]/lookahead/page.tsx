import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/format/formatters";
import { buildLookAhead } from "@/services/advanced-planning";
import { getProjectView } from "@/services/projects";
import { cn } from "@/lib/utils";

export default async function ProjectLookAheadPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  const lookAhead = buildLookAhead(view, 4);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/85 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Look-ahead 4 semaines
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1a4a20]">
          {view.aggregate.project.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Vue chantier imprimee: taches a executer, responsables, et statut retard / risque / OK.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan des prochaines semaines</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">WBS</th>
                <th className="px-4 py-3">Tache</th>
                <th className="px-4 py-3">Debut</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Ressources</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {lookAhead.map((entry) => (
                <tr key={entry.task.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-500">{entry.task.wbsCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{entry.task.name}</td>
                  <td className="px-4 py-3">{formatDateLabel(entry.task.scheduledStartDate)}</td>
                  <td className="px-4 py-3">{formatDateLabel(entry.task.scheduledFinishDate)}</td>
                  <td className="px-4 py-3">{entry.resourceNames.join(", ") || "Non affecte"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
                        entry.status === "late"
                          ? "bg-rose-100 text-rose-700"
                          : entry.status === "at_risk"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {entry.status === "late" ? "En retard" : entry.status === "at_risk" ? "A risque" : "OK"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{entry.reason}</td>
                </tr>
              ))}
              {!lookAhead.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Aucune tache planifiee sur les 4 prochaines semaines.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

