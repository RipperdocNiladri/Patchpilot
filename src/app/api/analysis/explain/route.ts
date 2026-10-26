import { NextResponse } from "next/server";
import { AnalysisService } from "@/lib/ai/analysis";
import {
  handleRouteError,
  HttpError,
  validateExplainPayload,
} from "@/lib/validation";

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON request body.");
    }

    const { owner, repo, path } = validateExplainPayload(rawBody);
    const service = new AnalysisService();
    const explanation = await service.explainFile(owner, repo, path);
    return NextResponse.json(explanation);
  } catch (error) {
    return handleRouteError(error);
  }
}
