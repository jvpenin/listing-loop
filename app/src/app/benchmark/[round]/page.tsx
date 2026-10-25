import { getIntel } from "@/lib/fsdata";
import { Benchmark } from "@/components/Benchmark";
import { notFound } from "next/navigation";
export const metadata = { title: "Case study · Competitor intel" };
export default async function Page({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  if (!/^r\d+$/.test(round)) notFound();
  const intel = await getIntel(round);
  if (!intel) notFound();
  return <Benchmark intel={intel} round={round} />;
}
