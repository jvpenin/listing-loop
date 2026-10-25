import { NextRequest, NextResponse } from "next/server";
import { jobAlive, readEvents, readJob, validId } from "@/lib/lab";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MS = 20 * 60_000;
// After the engine process is gone, wait this long for trailing lines before closing.
const GRACE_MS = 5_000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  try {
    validId(jobId);
  } catch {
    return NextResponse.json({ error: "Invalid job." }, { status: 400 });
  }
  if (!(await readJob(jobId))) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  // Replay (Vercel or ?replay=1): send the recorded events with their timing compressed.
  const speed = Number(req.nextUrl.searchParams.get("speed") ?? 0);
  const encoder = new TextEncoder();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const begin = Date.now();
      let offset = 0;
      let deadSince = 0;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", stop);
      const send = (line: string) => {
        if (!stopped) controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      };
      if (speed > 0) {
        const { lines } = readEvents(jobId, 0);
        let i = 0;
        const next = () => {
          if (stopped) return;
          const line = lines[i++];
          if (!line) return stop();
          send(line);
          if (JSON.parse(line).type === "done") return stop();
          const gap = lines[i] ? (JSON.parse(lines[i]).t - JSON.parse(line).t) / speed : 0;
          timer = setTimeout(next, Math.min(Math.max(gap, 30), 2500));
        };
        return next();
      }
      const tick = async () => {
        if (stopped) return;
        try {
          const r = readEvents(jobId, offset);
          offset = r.offset;
          for (const line of r.lines) {
            send(line);
            if (JSON.parse(line).type === "done") return stop();
          }
          if (!jobAlive(await readJob(jobId))) {
            deadSince ||= Date.now();
            if (Date.now() - deadSince > GRACE_MS) {
              send(JSON.stringify({ t: Date.now() - begin, type: "done", ok: false, secs: 0, error: "engine process exited" }));
              return stop();
            }
          } else deadSince = 0;
          if (Date.now() - begin > MAX_MS) return stop();
          // Keep proxies from closing an idle connection while a droid works for minutes.
          if (!r.lines.length) controller.enqueue(encoder.encode(": ping\n\n"));
          timer = setTimeout(tick, 500);
        } catch {
          stop();
        }
      };
      tick();
    },
    cancel() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
