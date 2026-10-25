import { ArrowUpRight, Check, Info, Sparkles } from "lucide-react";
import { useId, type ReactNode } from "react";
export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M10 25c-8-3-4-15 4-12 4 2 4 12 9 14 9 4 15-8 8-13-6-5-10 3-13 8"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        Fox<span className="logo-light">.ai</span>
      </span>
    </span>
  );
}
export function Mascot({
  name = "lo",
  className = "",
}: {
  name?: "lo" | "fox" | "spark";
  className?: string;
}) {
  const clipId = useId();
  const boxes = {
    lo: "55 235 495 610",
    fox: "548 225 522 620",
    spark: "1000 535 500 310",
  };
  const polygons = {
    lo: "55,235 550,235 550,845 55,845",
    fox: "550,225 1070,225 1070,535 995,535 995,845 550,845",
    spark: "1000,550 1340,550 1340,535 1500,535 1500,845 1000,845",
  };
  return (
    <svg
      className={`mascot mascot-${name} ${className}`}
      viewBox={boxes[name]}
      role="img"
      aria-label={
        name === "lo"
          ? "Lo, the Fox.ai mascot"
          : name === "fox"
            ? "Fox, the creative producer"
            : "Spark, the analyst"
      }
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={polygons[name]} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clipId})`}
        href="/brand/mascots-cutout.png"
        width="1531"
        height="1027"
      />
    </svg>
  );
}

export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Notice({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`notice ${tone}`}>
      <Info size={17} />
      <div>{children}</div>
    </div>
  );
}
export function Guide({
  name,
  title,
  children,
}: {
  name: "lo" | "fox" | "spark";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="guide">
      <Mascot name={name} />
      <div>
        <span className="eyebrow">
          {name === "lo"
            ? "A hand from Lo"
            : name === "fox"
              ? "A tip from Fox"
              : "Spark explains"}
        </span>
        <h3>{title}</h3>
        <div className="muted">{children}</div>
      </div>
    </div>
  );
}
export function PageTitle({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Sparkles size={26} />
      <p>{children}</p>
    </div>
  );
}
export { ArrowUpRight, Check };
