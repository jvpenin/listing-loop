import { NextRequest, NextResponse } from "next/server";
import { setCampaignApproval } from "@/lib/lab";
import { setApproval } from "@/lib/fsdata";
import { CASE_ID } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; round: string; vid: string }> }) {
  const { id, round, vid } = await params;
  try {
    const body = await req.json();
    if (typeof body.approved !== "boolean")
      return NextResponse.json({ error: "Send approved as a boolean." }, { status: 400 });
    const approvals =
      id === CASE_ID ? await setApproval(round, vid, body.approved) : await setCampaignApproval(id, round, vid, body.approved);
    return NextResponse.json({ approvals });
  } catch {
    return NextResponse.json({ error: "Could not save." }, { status: 400 });
  }
}
