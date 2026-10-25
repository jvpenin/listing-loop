import { NextRequest, NextResponse } from "next/server";
import { startJob } from "@/lib/lab";
import { guard } from "../guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const jobId = await startJob({ kind: "learn" });
  return NextResponse.json({ jobId }, { status: 202 });
}
