import { NextResponse } from "next/server";
import { RepositoryService } from "@/lib/github/repositories";
import { handleRouteError } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const service = new RepositoryService();
    const tree = await service.getTree(owner, repo);
    return NextResponse.json(tree);
  } catch (error) {
    return handleRouteError(error);
  }
}
