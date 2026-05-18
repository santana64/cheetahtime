import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPertNetwork } from "@/services/advanced-planning";
import { getProjectView } from "@/services/projects";
import { cn } from "@/lib/utils";

const NODE_W = 200;
const NODE_H = 54;
const COL_GAP = 80;
const ROW_GAP = 18;

function layoutNodes(nodes: ReturnType<typeof buildPertNetwork>["nodes"]) {
  const byDepth = new Map<number, typeof nodes>();
  for (const node of nodes) {
    const bucket = byDepth.get(node.depth) ?? [];
    bucket.push(node);
    byDepth.set(node.depth, bucket);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();

  for (const depth of depths) {
    const col = depths.indexOf(depth);
    const colNodes = byDepth.get(depth) ?? [];
    const totalH = colNodes.length * NODE_H + (colNodes.length - 1) * ROW_GAP;
    let y = -totalH / 2;
    for (const node of colNodes) {
      positions.set(node.id, { x: col * (NODE_W + COL_GAP), y });
      y += NODE_H + ROW_GAP;
    }
  }

  return { positions, colCount: depths.length };
}

function PertDiagram({ nodes, edges }: ReturnType<typeof buildPertNetwork>) {
  const { positions, colCount } = layoutNodes(nodes);

  if (!nodes.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        Aucune tâche dans ce projet.
      </div>
    );
  }

  const allY = [...positions.values()].map((p) => p.y);
  const minY = Math.min(...allY) - 20;
  const maxY = Math.max(...allY) + NODE_H + 20;
  const totalW = colCount * (NODE_W + COL_GAP) + 40;
  const totalH = maxY - minY;
  const offsetY = -minY;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ minWidth: totalW, height: Math.max(totalH, 200) }}
        className="w-full"
      >
        {/* Arrow marker */}
        <defs>
          <marker id="arrow-pert" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-pert-critical" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
          </marker>
        </defs>

        {/* Edges first (behind nodes) */}
        {edges.map((edge) => {
          const src = positions.get(edge.source);
          const tgt = positions.get(edge.target);
          if (!src || !tgt) return null;

          const srcNode = nodes.find((n) => n.id === edge.source);
          const tgtNode = nodes.find((n) => n.id === edge.target);
          const isCritical = srcNode?.critical && tgtNode?.critical;

          const x1 = src.x + NODE_W;
          const y1 = src.y + offsetY + NODE_H / 2;
          const x2 = tgt.x - 4;
          const y2 = tgt.y + offsetY + NODE_H / 2;
          const mx = (x1 + x2) / 2;

          return (
            <g key={edge.id}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                fill="none"
                stroke={isCritical ? "#f87171" : "#cbd5e1"}
                strokeWidth={isCritical ? 2.5 : 1.5}
                markerEnd={isCritical ? "url(#arrow-pert-critical)" : "url(#arrow-pert)"}
              />
              {edge.lagDays !== 0 && (
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 4}
                  fontSize="10"
                  fill="#94a3b8"
                  textAnchor="middle"
                >
                  {edge.type}{edge.lagDays > 0 ? `+${edge.lagDays}j` : `${edge.lagDays}j`}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const x = pos.x;
          const y = pos.y + offsetY;
          const isMilestone = node.type === "MILESTONE";
          const isSummary = node.type === "SUMMARY";

          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={isMilestone ? 27 : 8}
                fill={node.critical ? "#fff1f2" : isSummary ? "#f8fafc" : "white"}
                stroke={node.critical ? "#fca5a5" : isSummary ? "#94a3b8" : "#e2e8f0"}
                strokeWidth={node.critical ? 2 : 1}
              />
              {/* WBS chip */}
              <rect
                x={x + 6}
                y={y + 6}
                width={34}
                height={16}
                rx={4}
                fill={node.critical ? "#fecdd3" : "#f1f5f9"}
              />
              <text
                x={x + 23}
                y={y + 18}
                fontSize="9"
                fontWeight="bold"
                fill={node.critical ? "#be123c" : "#64748b"}
                textAnchor="middle"
              >
                {node.label.split(" ")[0]}
              </text>
              {/* Name */}
              <text
                x={x + 46}
                y={y + 22}
                fontSize="11"
                fontWeight={node.critical ? "700" : "500"}
                fill={node.critical ? "#9f1239" : "#0f172a"}
              >
                {node.label.slice(node.label.indexOf(" ") + 1).slice(0, 22)}
                {node.label.slice(node.label.indexOf(" ") + 1).length > 22 ? "…" : ""}
              </text>
              {/* Type badge */}
              <text
                x={x + 46}
                y={y + 36}
                fontSize="9"
                fill={node.critical ? "#e11d48" : "#94a3b8"}
                fontWeight="600"
              >
                {isMilestone ? "◆ JALON" : isSummary ? "▶ LOT" : "▪ TÂCHE"}
                {node.critical ? " — CRITIQUE" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function ProjectNetworkPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  const network = buildPertNetwork(view);

  const criticalEdges = network.edges.filter((edge) => {
    const src = network.nodes.find((n) => n.id === edge.source);
    const tgt = network.nodes.find((n) => n.id === edge.target);
    return src?.critical && tgt?.critical;
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/85 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Diagramme réseau PERT
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#1a4a20]">
          Logique de dépendances
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Vue logique indépendante de l'axe temps. Chemin critique en{" "}
          <span className="font-semibold text-rose-500">rouge</span>. Survol = type de lien et décalage.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span><span className="mr-1 inline-block h-2 w-6 rounded-full bg-rose-300 align-middle" />Chemin critique</span>
          <span><span className="mr-1 inline-block h-2 w-6 rounded-full bg-slate-300 align-middle" />Hors critique</span>
          <span className="font-semibold">{network.nodes.length} tâches · {network.edges.length} liens · {criticalEdges.length} liens critiques</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagramme réseau</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <PertDiagram nodes={network.nodes} edges={network.edges} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Table des liens de dépendance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Prédécesseur</th>
                <th className="px-4 py-3">Successeur</th>
                <th className="px-4 py-3">Décalage</th>
                <th className="px-4 py-3">Critique</th>
              </tr>
            </thead>
            <tbody>
              {network.edges.map((edge) => {
                const src = network.nodes.find((n) => n.id === edge.source);
                const tgt = network.nodes.find((n) => n.id === edge.target);
                const isCritical = src?.critical && tgt?.critical;
                return (
                  <tr key={edge.id} className={cn("border-b border-slate-100", isCritical && "bg-rose-50/40")}>
                    <td className="px-4 py-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">{edge.type}</span>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">{src?.label ?? edge.source}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{tgt?.label ?? edge.target}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {edge.lagDays === 0 ? "—" : edge.lagDays > 0 ? `+${edge.lagDays}j` : `${edge.lagDays}j`}
                    </td>
                    <td className="px-4 py-2">
                      {isCritical
                        ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Oui</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!network.edges.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune dépendance définie.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
