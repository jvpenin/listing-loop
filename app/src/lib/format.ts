const locales: Record<string, string> = { BRL: "pt-BR", USD: "en-US" };
export const money = (n: number | null | undefined, currency = "BRL") =>
  n == null || !Number.isFinite(n)
    ? "no data"
    : new Intl.NumberFormat(locales[currency] ?? "en-US", {
        style: "currency",
        currency,
      }).format(n);
export const number = (n: number | null | undefined) =>
  n == null
    ? "no data"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
export const percent = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(n);
export const labels: Record<string, string> = {
  academia: "Gym",
  casual: "Casual",
  conforto: "Comfort",
  presente: "Gift",
  neutro: "Neutral",
  solo_grade: "Flat-lay grid",
  solo_linha: "Flat-lay row",
  solo: "Product only",
  modelo: "On model",
  uso: "In use",
  organico: "Organic",
  ads: "Ads",
  afiliado: "Affiliate",
  exploit: "Exploit",
  explore: "Explore",
  angulo: "Angle",
  capa: "Cover style",
  aquisicao: "Acquisition",
  oferta: "Offer",
  sem_capa: "No cover",
  high: "high",
  medium: "medium",
  low: "low",
};
const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s;
export const label = (s: string) => labels[s] ?? capitalize(s);

export const probability = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: n > 0 && n < 0.01 ? 3 : 2,
  }).format(n);
