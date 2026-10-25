import { getRound, competitorUrls } from "@/lib/fsdata";
import { Portfolio } from "@/components/Portfolio";
import { notFound } from "next/navigation";
export const metadata = { title: "Case study · Variants" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  const { round } = await params;
  if (!/^r\d+$/.test(round)) notFound();
  const [data, urls, search] = await Promise.all([
    getRound(round),
    competitorUrls(),
    searchParams,
  ]);
  if (!data) notFound();
  return (
    <Portfolio
      key={round}
      data={data}
      urls={urls}
      round={round}
      replay={search.replay === "1"}
      rounds={[
        { round: "r1", href: "/rodada/r1", label: "Round 1" },
        { round: "r2", href: "/rodada/r2", label: "Round 2 · real data" },
      ]}
    />
  );
}
