import { notFound } from "next/navigation";

import { ProjectSettingsPage } from "@/features/projects/project-settings-page";
import { requireCurrentSession } from "@/services/auth";
import { getProjectView } from "@/services/projects";

export default async function ProjectSettingsRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireCurrentSession();
  const { projectId } = await params;
  const view = await getProjectView(projectId, { workspaceId: session.workspaceId }).catch(() => notFound());
  return <ProjectSettingsPage view={view} />;
}
