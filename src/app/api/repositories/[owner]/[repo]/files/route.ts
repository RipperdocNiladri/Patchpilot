import { NextResponse } from "next/server";
import { RepositoryService } from "@/lib/github/repositories";
import { handleRouteError, HttpError } from "@/lib/validation";

export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath || !filePath.trim()) {
      throw new HttpError(400, "Query parameter 'path' is required.");
    }

    const service = new RepositoryService();
    const fileContent = await service.getFileContent(owner, repo, filePath);
    return NextResponse.json(fileContent);
  } catch (error) {
    return handleRouteError(error);
  }
}
