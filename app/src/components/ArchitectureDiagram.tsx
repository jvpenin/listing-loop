import { ArrowRight, Database, Bot, UserCheck, Brain, RefreshCw } from "lucide-react";
import styles from "./Overview.module.css";

const steps = [
  { title: "Research", subtitle: "Apify · Shopee competitors", icon: Database },
  { title: "Create", subtitle: "Producer droids · copy + covers", icon: Bot },
  { title: "Approve", subtitle: "Seller reviews every listing", icon: UserCheck },
  { title: "Learn", subtitle: "Analyst droid · sales evidence", icon: Brain },
  { title: "Improve", subtitle: "Versioned memory → next round", icon: RefreshCw },
];

export function ArchitectureDiagram() {
  return (
    <figure className={styles.architecture} aria-label="Apify researches competitors; Factory producer droids create listings; a seller approves; the analyst learns from sales; versioned memory guides the next round.">
      <ol className={styles.flow}>
        {steps.map(({ title, subtitle, icon: Icon }, index) => (
          <li key={title}>
            <Icon size={19} aria-hidden="true" />
            <strong>{title}</strong>
            <span>{subtitle}</span>
            {index < steps.length - 1 && <ArrowRight className={styles.flowArrow} size={15} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <figcaption>Factory orchestrates. Claude creates and reasons. TypeScript plans experiments and validates outputs.</figcaption>
    </figure>
  );
}
