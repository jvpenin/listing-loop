"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  FlaskConical,
  FolderKanban,
  LayoutGrid,
  Repeat,
  Search,
  ChartNoAxesCombined,
  ArrowUpRight,
  CircleHelp,
  X,
  Menu,
  Play,
  Cpu,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Logo, Mascot } from "./Brand";
import { EngineTerminal } from "./EngineTerminal";

type NavItem = { href: string; label: string; icon: typeof Layers };
const mainNav: NavItem[] = [
  { href: "/", label: "Overview", icon: Layers },
  { href: "/lab", label: "Live Lab", icon: FlaskConical },
  { href: "/campaigns", label: "Campaigns", icon: FolderKanban },
];
const caseNav: NavItem[] = [
  { href: "/rodada/r1", label: "Round 1", icon: LayoutGrid },
  { href: "/rodada/r2", label: "Round 2", icon: Repeat },
  { href: "/benchmark/r1", label: "Competitor intel", icon: Search },
  { href: "/aprendizado", label: "Learning loop", icon: ChartNoAxesCombined },
];
const allNav = [...mainNav, ...caseNav];

type LabStatus = {
  live: boolean;
  budget?: { used: number; cap: number };
  droidVersion?: string;
};

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/rodada/")) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/") ||
    pathname.startsWith(href.split("/").slice(0, 2).join("/") + "/");
}

export function Shell({
  children,
  live,
}: {
  children: React.ReactNode;
  live: boolean;
}) {
  const pathname = usePathname();
  const [help, setHelp] = useState(false),
    [menu, setMenu] = useState(false);
  const [status, setStatus] = useState<LabStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const helpRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/lab/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: LabStatus) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatusFailed(true));
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        helpRoot.current?.querySelectorAll<HTMLElement>("button,a[href]") ?? [],
      );
    focusables()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (e.key === "Tab") {
        const all = focusables(),
          first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [help]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  const isLive = status?.live ?? live;
  const current = allNav.find((n) => isActive(n.href, pathname));
  const navLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href, pathname);
    return (
      <Link
        key={href}
        href={href}
        className={active ? "active" : ""}
        aria-current={active ? "page" : undefined}
        onClick={() => setMenu(false)}
      >
        <Icon size={19} />
        <span>{label}</span>
      </Link>
    );
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand-link" aria-label="Listing Loop, overview">
          <Logo />
        </Link>
        <div className="project-badge">
          <span className="tiny-dot" /> Cal Hacks 13 · Listing Loop
        </div>
        <span className="nav-caption">THE DEMO</span>
        <nav aria-label="Main navigation">{mainNav.map(navLink)}</nav>
        <span className="nav-caption nav-caption-case">
          CASE STUDY · DNT (REAL DATA)
        </span>
        <nav aria-label="Case study">{caseNav.map(navLink)}</nav>
        <div className="sidebar-bottom">
          <div className={`lab-status ${isLive ? "is-live" : ""}`}>
            <div className="lab-status-head">
              <Cpu size={15} />
              <strong>Engine status</strong>
            </div>
            <dl>
              <div>
                <dt>Mode</dt>
                <dd>{isLive ? "Live (droids armed)" : "Replay"}</dd>
              </div>
              <div>
                <dt>Factory sessions</dt>
                <dd>
                  {status?.budget
                    ? `${status.budget.used} / ${status.budget.cap}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>droid CLI</dt>
                <dd>{status?.droidVersion ?? "—"}</dd>
              </div>
            </dl>
            {statusFailed && !status && (
              <small>Status endpoint unavailable. Showing recorded data.</small>
            )}
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> How to judge this demo{" "}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            {caseNav.includes(current as NavItem) ? "Case study · DNT" : "Listing Loop"}{" "}
            <span>/</span> <strong>{current?.label ?? "Listing Loop"}</strong>
          </div>
          <div className="top-actions">
            <span className={`replay-pill ${isLive ? "live" : ""}`}>
              <span />
              {isLive ? "LIVE · droids armed" : "Replay mode"}
            </span>
            <button
              className="icon-button"
              aria-label="How to judge this demo"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="app-footer">
          <Logo />
          <span>Built at Cal Hacks 13 · Anthropic · Factory · Apify · Figma</span>
          <span>The seller decides. The loop learns.</span>
        </footer>
        <EngineTerminal />
      </div>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            ref={helpRoot}
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close"
              onClick={() => setHelp(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <Mascot name="lo" />
            <span className="eyebrow">FOR JUDGES</span>
            <h2 id="help-title">How to judge this demo</h2>
            <p>
              Three minutes, three steps. Everything you see is read from the
              files the agents write.
            </p>
            <ol>
              <li>
                <strong>Run the droids.</strong> In the Live Lab, pick any
                product and marketplace. Apify scrapes competitors, then the{" "}
                <code>listing-producer</code> droids write the listings and
                generate covers in parallel.
              </li>
              <li>
                <strong>Watch the campaign.</strong> Each campaign is a series
                of rounds. The plan explores and exploits with Thompson
                sampling, and you approve what goes out.
              </li>
              <li>
                <strong>See memory get rewritten.</strong> The{" "}
                <code>performance-analyst</code> droid reads real sales stats
                and proposes evidence-backed playbook changes, versioned in
                git.
              </li>
            </ol>
            <div className="notice blue">
              <Play size={18} />
              <p>
                {isLive
                  ? "Live mode: the buttons in the Live Lab start real Factory droid sessions on this laptop."
                  : "Replay mode: recorded runs are replayed. Live runs happen on our laptop at the table."}
              </p>
            </div>
            <Link
              href="/lab"
              className="button primary"
              onClick={() => setHelp(false)}
            >
              Open the Live Lab <ArrowUpRight size={17} />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
