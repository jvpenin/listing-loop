import { live } from "@/lib/fsdata";
import { LiveLab } from "@/components/LiveLab";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  const initialJob = job && /^[\w-]{1,80}$/.test(job) ? job : undefined;
  return <LiveLab live={live} initialJob={initialJob} />;
}
