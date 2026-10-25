import { NextResponse } from "next/server";
import { getCampaignRound } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string; round: string }> }) {
  const { id, round } = await params;
  try {
    const data = await getCampaignRound(id, round);
    return data
      ? NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Round not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Invalid campaign or round." }, { status: 400 });
  }
}
