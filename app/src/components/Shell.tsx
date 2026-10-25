"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartNoAxesCombined, FolderKanban, Layers, Menu, Plus, X } from "lucide-react";
import { Logo } from "./Brand";
import "./StudioShell.css";

export function Shell({ children }: { children: React.ReactNode; live: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = [
    { href: "/", label: "Generate listings", icon: Plus, active: pathname === "/" || pathname === "/lab" },
    { href: "/campaigns", label: "Review & publish", icon: FolderKanban, active: pathname.startsWith("/campaigns") || pathname.startsWith("/rodada/") },
    { href: "/aprendizado", label: "Insights", icon: ChartNoAxesCombined, active: pathname === "/aprendizado" || pathname.startsWith("/benchmark/") },
    { href: "/architecture", label: "Architecture", icon: Layers, active: pathname === "/architecture" },
  ];
  const current = items.find(item => item.active);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <div className="studio-shell">
      {menuOpen && <button className="studio-menu-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`studio-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Workspace">
        <Link className="studio-brand" href="/" aria-label="Fox.ai home" onClick={() => setMenuOpen(false)}><Logo /></Link>
        <span className="studio-nav-caption">WORKSPACE</span>
        <nav id="workspace-navigation" aria-label="Main navigation">{items.map(({ icon: Icon, ...item }) => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon size={19} aria-hidden="true" />{item.label}</Link>)}</nav>
        <div className="studio-store"><span />Your store · Demo</div>
      </aside>
      <div className="studio-content">
        <header className="studio-header">
          <button type="button" className="studio-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
          <div className="studio-breadcrumb">My products <span>/</span> <strong>{current?.label ?? "Fox.ai"}</strong></div>
          <span className="studio-marketplace">Shopee Brazil</span>
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
