import { notFound } from "next/navigation";
import { live } from "@/lib/fsdata";
import { CampaignDetail } from "@/components/Campaigns";
export const metadata = { title: "Campaign" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[\w-]{1,80}$/.test(id)) notFound();
  return <CampaignDetail id={id} live={live} />;
}
