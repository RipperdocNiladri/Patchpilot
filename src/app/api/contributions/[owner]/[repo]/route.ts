import { NextResponse } from "next/server";
import { ContributionService } from "@/lib/contributions/analyzer";
import { handleRouteError } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const service = new ContributionService();
    const opportunities = await service.getOpportunities(owner, repo);
    return NextResponse.json(opportunities);
  } catch (error) {
    return handleRouteError(error);
  }
}
