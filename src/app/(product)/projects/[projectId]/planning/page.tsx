import { PlanningWorkspace } from "@/features/projects/planning-workspace";
import { getProjectView } from "@/services/projects";
import { notFound } from "next/navigation";

export default async function ProjectPlanningPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  return <PlanningWorkspace view={view} />;
}
