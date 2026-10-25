import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { coverPath } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string; round: string; vid: string }> }) {
  const { id, round, vid } = await params;
  try {
    const file = await fs.readFile(coverPath(id, round, vid));
    return new NextResponse(file, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Cover not found." }, { status: 404 });
  }
}
