import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await listCampaigns(), { headers: { "Cache-Control": "no-store" } });
}
