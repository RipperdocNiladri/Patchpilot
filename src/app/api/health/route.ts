import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "PatchPilot Full-Stack Next.js API",
  });
}
