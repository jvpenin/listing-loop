"use client";
import { useEffect, useRef } from "react";
import { Bot, LoaderCircle, CircleCheck, CircleX } from "lucide-react";
import { sponsorOf, type LabEvent } from "@/lib/labTypes";
import { SponsorBadge } from "./EngineTerminal";

export const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;

const SOURCE_TONES = ["v1", "v2", "v3", "v4"];
export function toneOf(source: string) {
  if (source === "system" || source === "apify" || source === "plan" || source === "analyst")
    return source;
  const n = Number(source.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? SOURCE_TONES[(n - 1) % 4] : "system";
}

type Line = Extract<LabEvent, { type: "log" } | { type: "tool" }>;

// One droid lane: the live tool calls and log lines of a single source (v01, analyst, ...).
export function DroidTerminal({
  title,
  subtitle,
  source,
  events,
  state,
  emptyText = "Waiting for the droid to start…",
}: {
  title: string;
  subtitle?: string;
  source: string | string[];
  events: LabEvent[];
  state: "idle" | "running" | "ok" | "error";
  emptyText?: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const wanted = Array.isArray(source) ? source : [source];
  const lines = events.filter(
    (e): e is Line => (e.type === "log" || e.type === "tool") && wanted.includes(e.source),
  );
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <section className={`lab-term tone-${toneOf(wanted[0])}`} aria-label={`${title} activity`}>
      <header>
        <Bot size={15} />
        <div>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
        <span className={`lab-term-state ${state}`}>
          {state === "running" && <LoaderCircle size={13} className="spin" />}
          {state === "ok" && <CircleCheck size={13} />}
          {state === "error" && <CircleX size={13} />}
          {state === "idle" ? "queued" : state === "running" ? "running" : state === "ok" ? "done" : "failed"}
        </span>
      </header>
      <div className="lab-term-body" ref={body} role="log" aria-live="polite">
        {lines.length === 0 && <p className="lab-term-empty">{emptyText}</p>}
        {lines.map((l, i) => (
          <p key={i} className={`${l.type} tone-${toneOf(l.source)}`}>
            <time>{secs(l.t).padStart(5, " ")}</time>
            <SponsorBadge by={sponsorOf(l)} />
            {wanted.length > 1 && <em>{l.source}</em>}
            {l.type === "tool" ? (
              <>
                <b>⏺ {l.name}</b>
                {l.detail && <span>({l.detail})</span>}
              </>
            ) : (
              <span>{l.text}</span>
            )}
          </p>
        ))}
      </div>
    </section>
  );
}
