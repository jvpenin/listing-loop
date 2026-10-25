import { NextRequest, NextResponse } from "next/server";
import { nextRound, readCampaign, startJob, validId } from "@/lib/lab";
import { guard } from "../../../guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const { id } = await params;
  try {
    validId(id);
  } catch {
    return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  }
  if (!(await readCampaign(id))) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(body.variants ?? 2) || 2, 1), 4);
  const round = await nextRound(id);
  const jobId = await startJob({ kind: "round", campaignId: id, round, n, dry: body.dry === true });
  return NextResponse.json({ campaignId: id, round, jobId }, { status: 202 });
}
