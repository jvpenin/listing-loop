import Link from "next/link";
import { ArrowRight, Bot, Database } from "lucide-react";

// Compact strip on every DNT case-study screen: what data this is and which droid produced it.
export function CaseHeader({
  droids = ["producer", "analyst"],
}: {
  droids?: ("producer" | "analyst")[];
}) {
  return (
    <div className="case-strip">
      <span className="case-strip-label">
        <Database size={14} /> Case study · DNT · Shopee Brazil · real Seller
        Center data (14 listings, 30 days)
      </span>
      <span className="case-strip-chips">
        {droids.includes("producer") && (
          <span className="case-chip">
            <Bot size={13} /> listing-producer · claude-haiku-5-5
          </span>
        )}
        {droids.includes("analyst") && (
          <span className="case-chip">
            <Bot size={13} /> performance-analyst · claude-opus-5-5
          </span>
        )}
      </span>
      <Link href="/lab" className="case-strip-link">
        Run it on your own product <ArrowRight size={14} />
      </Link>
    </div>
  );
}
