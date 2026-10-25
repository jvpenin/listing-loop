import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  getRound,
  getIntel,
  getLearning,
  competitorUrls,
  rounds,
  root,
  live,
  validRound,
  validVariant,
  setApproval,
} from "@/lib/fsdata";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const missing = () =>
  NextResponse.json({ error: "Dados não encontrados." }, { status: 404 });
const json = (value: unknown) =>
  NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  try {
    const s = (await params).segments;
    if (s.length === 1 && s[0] === "rounds")
      return json((await rounds()).filter(Boolean));
    if (s.length === 1 && s[0] === "product") {
      const file = await fs.readFile(path.join(root, "data/product/photo.jpg"));
      return new NextResponse(file, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
    if (s.length === 1 && s[0] === "learning") {
      const r = validRound(req.nextUrl.searchParams.get("round") ?? "r2");
      return json(await getLearning(r));
    }
    if (s.length === 2 && s[0] === "intel") {
      const intel = await getIntel(validRound(s[1]));
      return intel
        ? json({ ...intel, competitorUrls: await competitorUrls() })
        : missing();
    }
    if (s[0] === "round" && s[1]) {
      const round = validRound(s[1]);
      if (s.length === 2) {
        const data = await getRound(round);
        return data ? json(data) : missing();
      }
      if (s.length === 4 && s[2] === "cover") {
        const vid = validVariant(s[3]);
        const file = await fs.readFile(
          path.join(root, `runs/${round}/covers/${vid}.png`),
        );
        return new NextResponse(file, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (s.length === 3 && s[2] === "stream") {
        const data = await getRound(round);
        if (!data) return missing();
        const encoder = new TextEncoder();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;
        const seen = new Set<string>();
        let cleanup = () => {};
        const stream = new ReadableStream({
          start(controller) {
            const stop = () => {
              if (stopped) return;
              stopped = true;
              if (timer) clearTimeout(timer);
              req.signal.removeEventListener("abort", stop);
              try {
                controller.close();
              } catch {}
            };
            cleanup = stop;
            req.signal.addEventListener("abort", stop);
            const send = (event: unknown, name?: string) => {
              if (!stopped)
                controller.enqueue(
                  encoder.encode(
                    `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(event)}\n\n`,
                  ),
                );
            };
            let index = 0;
            const existing = data.variants.filter(Boolean);
            const begin = Date.now();
            const tick = async () => {
              if (stopped) return;
              try {
                if (!live) {
                  const item = existing[index++];
                  if (item) send({ variantId: item.variantId });
                  if (index >= existing.length) {
                    send({ generated: existing.length }, "done");
                    stop();
                    return;
                  }
                } else {
                  const current = await getRound(round);
                  for (const item of current?.variants ?? []) {
                    if (item && !seen.has(item.variantId)) {
                      seen.add(item.variantId);
                      send({ variantId: item.variantId });
                    }
                  }
                  if (
                    seen.size === data.plan.variants.length ||
                    Date.now() - begin > 60000
                  ) {
                    send({ generated: seen.size }, "done");
                    stop();
                    return;
                  }
                }
                timer = setTimeout(tick, live ? 2000 : 340);
              } catch {
                stop();
              }
            };
            timer = setTimeout(tick, 200);
          },
          cancel() {
            cleanup();
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
    }
    return missing();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("inválid")
            ? error.message
            : "Arquivo indisponível.",
      },
      { status: 400 },
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  try {
    const s = (await params).segments;
    const origin = req.headers.get("origin");
    if (
      origin &&
      origin !== req.nextUrl.origin &&
      new URL(origin).host !== req.headers.get("host")
    )
      return NextResponse.json(
        { error: "Origem não permitida." },
        { status: 403 },
      );
    if (s.length === 4 && s[0] === "variant" && s[3] === "approve") {
      const round = validRound(s[1]),
        vid = validVariant(s[2]);
      const body = await req.json();
      if (typeof body.approved !== "boolean")
        return NextResponse.json(
          { error: "Informe approved como booleano." },
          { status: 400 },
        );
      const data = await getRound(round);
      if (!data?.variants.some((v) => v?.variantId === vid)) return missing();
      return json({ approvals: await setApproval(round, vid, body.approved) });
    }
    if (s.length === 1 && s[0] === "round") {
      if (!live)
        return NextResponse.json(
          { error: "Modo demonstração: agentes pagos estão desativados." },
          { status: 403 },
        );
      const { round } = await req.json();
      validRound(round);
      if (await getRound(round))
        return NextResponse.json(
          { error: "Esta rodada já existe. Escolha uma nova." },
          { status: 409 },
        );
      const child = spawn("npx", ["tsx", "src/round.ts", "--round", round], {
        cwd: root,
        detached: true,
        stdio: "ignore",
      });
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      return NextResponse.json({ round }, { status: 202 });
    }
    return missing();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar. Confira os dados e tente novamente." },
      { status: 400 },
    );
  }
}
