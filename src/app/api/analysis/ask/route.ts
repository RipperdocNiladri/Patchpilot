import { NextResponse } from "next/server";
import { AnalysisService } from "@/lib/ai/analysis";
import {
  handleRouteError,
  HttpError,
  validateAskPayload,
} from "@/lib/validation";

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON request body.");
    }

    const { owner, repo, path, question } = validateAskPayload(rawBody);
    const service = new AnalysisService();
    const answer = await service.askQuestion(owner, repo, path, question);
    return NextResponse.json(answer);
  } catch (error) {
    return handleRouteError(error);
  }
}
