"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, TerminalSquare } from "lucide-react";
import { SPONSOR_LABEL, sponsorOf, type LabEvent, type Sponsor } from "@/lib/labTypes";

// Global engine terminal: follows the running job (or the latest recorded one) and tags every line
// with who acted — Apify actor runs, Factory droid sessions, Claude's own words, or our TypeScript.

const SPONSORS: Sponsor[] = ["apify", "factory", "claude", "code", "system"];
const short = (s?: string | null, n = 8) => (s ? `${s.slice(0, n)}…` : "—");
const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;

export function SponsorBadge({ by }: { by: Sponsor }) {
  return <span className={`sp-badge sp-${by}`}>{SPONSOR_LABEL[by]}</span>;
}

// One readable line per event.
export function describe(e: LabEvent): { source: string; text: string } | null {
  switch (e.type) {
    case "log":
      return { source: e.source, text: e.text };
    case "tool":
      return { source: e.source, text: `⏺ ${e.name}${e.detail ? ` → ${e.detail}` : ""}` };
    case "stage":
      return {
        source: e.stage,
        text: `${e.stage} ${e.status === "start" ? "started" : e.status}${e.detail ? ` · ${e.detail}` : ""}`,
      };
    case "intel":
      return {
        source: "apify",
        text: `actor ${e.actor}${e.runId ? ` · run ${e.runId}` : ""}${e.datasetId ? ` · dataset ${e.datasetId}` : ""} → ${e.n} competitors${
          e.secs !== undefined ? ` in ${e.secs.toFixed(1)}s` : ""
        }${e.cached ? ` (cached from ${e.cached})` : ""}`,
      };
    case "memory":
      return {
        source: "memory",
        text: `playbook v${e.version}${e.commit ? ` @ ${e.commit.hash} "${e.commit.subject}"` : ""} · ${e.rules.length}/${e.totalRules} rules in scope ${e.scope.category}/${e.scope.channel}`,
      };
    case "plan": {
      const exploit = e.variants.filter((v) => v.mode === "exploit").length;
      return { source: "plan", text: `plan.json: ${e.variants.length} variants · ${exploit} exploit · ${e.variants.length - exploit} explore` };
    }
    case "cover":
      return { source: e.variantId, text: `cover image generated from the reference photo` };
    case "variant":
      return {
        source: e.variantId,
        text: `${e.ok ? "✓ Zod-validated (schema, fixed axes, cited competitor ids)" : `✗ ${e.why ?? "failed"}`} · ${secs(e.secs * 1000)}${
          e.sessionId ? ` · session ${short(e.sessionId)}` : ""
        }${e.factoryCredits ? ` · ${e.factoryCredits} Factory credits` : ""}`,
      };
    case "diff":
      return { source: "analyst", text: `analyst: ${e.diff.summary}` };
    case "done":
      return { source: "job", text: `job ${e.ok ? "finished" : "ended with errors"} in ${secs(e.secs * 1000)}` };
  }
}

// Job ids are `<kind>-<Date.now() base36>` (app/src/lib/lab.ts).
function jobDate(id: string) {
  const ms = parseInt(id.split("-").pop() ?? "", 36);
  return Number.isFinite(ms) && ms > 1.6e12 ? new Date(ms).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : null;
}

type Status = { live: boolean; runningJobId?: string | null; replayJobId?: string | null };

export function EngineTerminal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [events, setEvents] = useState<LabEvent[]>([]);
  const [hidden, setHidden] = useState<Set<Sponsor>>(new Set());
  const body = useRef<HTMLDivElement>(null);

  // Open by default on desktop at /lab; remember the viewer's choice otherwise.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("engine-terminal");
    } catch {}
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    setOpen(saved ? saved === "open" && desktop : desktop && pathname === "/lab");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem("engine-terminal", o ? "closed" : "open");
      } catch {}
      return !o;
    });

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/lab/status", { cache: "no-store" });
        if (r.ok && !stop) setStatus(await r.json());
      } catch {}
    };
    poll();
    const i = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(i);
    };
  }, []);

  const jobId = status?.runningJobId ?? status?.replayJobId ?? null;
  const running = !!status?.runningJobId;

  useEffect(() => {
    setEvents([]);
    if (!jobId) return;
    const es = new EventSource(`/api/lab/jobs/${encodeURIComponent(jobId)}/stream`);
    es.onopen = () => setEvents([]);
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data) as LabEvent;
        setEvents((all) => [...all, e]);
        if (e.type === "done") es.close();
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [jobId]);

  const lines = useMemo(
    () =>
      events
        .map((e) => ({ e, by: sponsorOf(e), d: describe(e) }))
        .filter((l): l is { e: LabEvent; by: Sponsor; d: { source: string; text: string } } => !!l.d && !hidden.has(l.by)),
    [events, hidden],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<Sponsor, number>> = {};
    for (const e of events) {
      const s = sponsorOf(e);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [events]);

  useEffect(() => {
    const el = body.current;
    if (el && open) el.scrollTop = el.scrollHeight;
  }, [lines.length, open]);

  const label = !jobId
    ? "no job yet"
    : running
      ? `live · ${jobId}`
      : `replaying recorded run · ${jobDate(jobId) ?? jobId}`;

  return (
    <>
      <div className={`engine-spacer ${open ? "open" : ""}`} aria-hidden />
      <section className={`engine-term ${open ? "open" : ""}`} aria-label="Engine terminal">
        <header>
          <button type="button" className="engine-toggle" onClick={toggle} aria-expanded={open}>
            <TerminalSquare size={15} />
            <b>Engine terminal</b>
            {running && <i className="engine-dot" />}
            <small>{label}</small>
            {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          {open && (
            <div className="engine-filters" role="group" aria-label="Show lines from">
              {SPONSORS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`sp-filter sp-${s} ${hidden.has(s) ? "off" : ""}`}
                  aria-pressed={!hidden.has(s)}
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(s)) n.delete(s);
                      else n.add(s);
                      return n;
                    })
                  }
                >
                  {SPONSOR_LABEL[s]} <span>{counts[s] ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </header>
        {open && (
          <div className="engine-body" ref={body} role="log" aria-live="polite">
            {!jobId && <p className="engine-empty">No job has run yet. Start one in the Live Lab.</p>}
            {jobId && lines.length === 0 && <p className="engine-empty">Connecting to {jobId}…</p>}
            {lines.map(({ e, by, d }, i) => (
              <p key={i}>
                <time>{secs(e.t).padStart(6, " ")}</time>
                <SponsorBadge by={by} />
                <em>{d.source}</em>
                <span>{d.text}</span>
              </p>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
