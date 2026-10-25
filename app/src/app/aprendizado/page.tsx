import { getLearning } from "@/lib/fsdata";
import { Learning } from "@/components/Learning";
export const metadata = { title: "Case study · Learning" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const search = await searchParams;
  const round = search.round === "r1" ? "r1" : "r2";
  return <Learning key={round} data={await getLearning(round)} round={round} />;
}
