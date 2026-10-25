import { NextResponse } from "next/server";
import { labStatus } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await labStatus(), { headers: { "Cache-Control": "no-store" } });
}
