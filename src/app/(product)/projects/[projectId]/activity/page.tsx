import { notFound } from "next/navigation";

import { ActivityFeed } from "@/features/projects/activity-feed";
import { TaskCollaborationPanel } from "@/features/projects/task-collaboration-panel";
import { requireCurrentSession } from "@/services/auth";
import { listProjectAttachments } from "@/services/attachments";
import { listActivity } from "@/services/activity";
import { listProjectComments } from "@/services/comments";
import { getProjectView } from "@/services/projects";

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireCurrentSession();
  const { projectId } = await params;
  const view = await getProjectView(projectId, { workspaceId: session.workspaceId }).catch(() => notFound());
  const [events, comments, attachments] = await Promise.all([
    listActivity(projectId, 250),
    listProjectComments(projectId),
    listProjectAttachments(projectId),
  ]);
  return (
    <div className="space-y-6">
      <TaskCollaborationPanel
        projectId={projectId}
        tasks={view.tasks}
        comments={comments}
        attachments={attachments}
      />
      <ActivityFeed events={events} />
    </div>
  );
}
