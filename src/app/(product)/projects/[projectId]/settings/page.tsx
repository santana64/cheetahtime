import { notFound } from "next/navigation";

import { ProjectSettingsPage } from "@/features/projects/project-settings-page";
import { getProjectView } from "@/services/projects";

export default async function ProjectSettingsRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  
  const { projectId } = await params;
  const view = await getProjectView(projectId, { workspaceId: "workspace-cheetah-time" }).catch(() => notFound());
  return <ProjectSettingsPage view={view} />;
}
