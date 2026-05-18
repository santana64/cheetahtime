import { ResourceView } from "@/features/projects/resource-view";
import { getProjectView } from "@/services/projects";
import { notFound } from "next/navigation";

export default async function ProjectResourcesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const view = await getProjectView(projectId).catch(() => notFound());
  return <ResourceView view={view} />;
}
