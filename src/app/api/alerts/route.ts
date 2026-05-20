import { jsonErrorFromUnknown, jsonResponse } from "@/lib/api/route-utils";
import {
  createSmartAlertDigest,
  listWorkspaceSmartAlerts,
} from "@/services/smart-alerts";
import type { NotificationChannel } from "@/services/notifications";

export async function GET() {
  try {
    
    const alerts = await listWorkspaceSmartAlerts("workspace-cheetah-time");
    return jsonResponse({
      generatedAt: new Date().toISOString(),
      workspaceId: "workspace-cheetah-time",
      counts: {
        critical: alerts.filter((alert) => alert.severity === "critical").length,
        warning: alerts.filter((alert) => alert.severity === "warning").length,
        info: alerts.filter((alert) => alert.severity === "info").length,
      },
      alerts,
    });
  } catch (error) {
    return jsonErrorFromUnknown(error, "Unable to load alerts.", 400);
  }
}

export async function POST(request: Request) {
  try {
    
    const body = (await request.json().catch(() => ({}))) as { channel?: NotificationChannel };
    const digest = await createSmartAlertDigest({
      workspaceId: "workspace-cheetah-time",
      userId: "user-cheetah-time-admin",
      channel: body.channel ?? "IN_APP",
    });
    return jsonResponse({ ok: true, digest }, 201);
  } catch (error) {
    return jsonErrorFromUnknown(error, "Unable to create alert digest.", 400);
  }
}
