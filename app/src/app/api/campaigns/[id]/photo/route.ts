import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { photoPath, validId, CASE_ID } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (id !== CASE_ID) validId(id);
    const file = await photoPath(id);
    if (!file) throw new Error("missing");
    return new NextResponse(await fs.readFile(file), {
      headers: { "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}
