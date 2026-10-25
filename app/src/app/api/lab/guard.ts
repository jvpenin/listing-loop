import { NextRequest, NextResponse } from "next/server";
import { live } from "@/lib/fsdata";
import { runningJob } from "@/lib/lab";

// Shared checks for the endpoints that open paid droid sessions.
export async function guard(req: NextRequest): Promise<NextResponse | null> {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  if (!live)
    return NextResponse.json(
      { error: "Replay mode: live droids run on our laptop at the judging table." },
      { status: 403 },
    );
  const running = await runningJob();
  if (running)
    return NextResponse.json(
      { error: "A droid job is already running. Wait for it to finish.", jobId: running.id },
      { status: 409 },
    );
  return null;
}
