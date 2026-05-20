import { jsonErrorFromUnknown, jsonResponse } from "@/lib/api/route-utils";
import { buildPortfolioRoadmap } from "@/services/advanced-planning";

export async function GET() {
  try {
    
    return jsonResponse(await buildPortfolioRoadmap("workspace-cheetah-time"));
  } catch (error) {
    return jsonErrorFromUnknown(error, "Unable to load portfolio roadmap.", 400);
  }
}

