import styles from "./TrackBrands.module.css";

/** Official local wordmarks: factory.com and apify.com. No remote image dependency. */
export function TrackBrands({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.brands} ${compact ? styles.compact : ""}`} aria-label="Built with Factory, Anthropic Claude, Apify and Figma">
      <span className={styles.factory}><strong>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/factory.svg" alt="Factory" width="127" height="19" /></strong>{!compact && <small>Droid runtime</small>}</span>
      <span className={styles.claude}><strong>Anthropic <b>Claude</b></strong>{!compact && <small>Copy + reasoning</small>}</span>
      <span className={styles.apify}><strong>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/apify.svg" alt="Apify" width="80" height="23" /></strong>{!compact && <small>Live market research</small>}</span>
      <span className={styles.figma}><strong><svg width="15" height="23" viewBox="0 0 30 45" fill="none" aria-hidden="true"><path d="M7.5 45A7.5 7.5 0 0 0 15 37.5V30H7.5a7.5 7.5 0 0 0 0 15Z" fill="#0ACF83"/><path d="M0 22.5A7.5 7.5 0 0 1 7.5 15H15v15H7.5A7.5 7.5 0 0 1 0 22.5Z" fill="#A259FF"/><path d="M0 7.5A7.5 7.5 0 0 1 7.5 0H15v15H7.5A7.5 7.5 0 0 1 0 7.5Z" fill="#F24E1E"/><path d="M15 0h7.5a7.5 7.5 0 0 1 0 15H15V0Z" fill="#FF7262"/><circle cx="22.5" cy="22.5" r="7.5" fill="#1ABCFE"/></svg> Figma</strong>{!compact && <small>Product design</small>}</span>
    </div>
  );
}
