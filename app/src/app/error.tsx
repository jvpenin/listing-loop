"use client";
import { AlertTriangle } from "lucide-react";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <AlertTriangle size={28} />
      <h1>Something went wrong.</h1>
      <p>The data for this screen could not be loaded.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
