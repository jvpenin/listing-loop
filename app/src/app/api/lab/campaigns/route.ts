import { NextRequest, NextResponse } from "next/server";
import { MARKETPLACES, createCampaign, startJob } from "@/lib/lab";
import { guard } from "../guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ANGLES = ["everyday use", "gift", "best value"];
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Send the form as multipart/form-data.");
  }
  const text = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const name = text("name", 80);
  const description = text("description", 600);
  const price = Number(String(form.get("price") ?? "").replace(",", "."));
  const marginText = text("marginPct", 20);
  const marginPct = marginText ? Number(marginText.replace(",", ".")) : undefined;
  const marketplace = text("marketplace", 40);
  const category = text("category", 40).toLowerCase() || "general";
  const angles = text("angles", 200)
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4);
  const n = Math.min(Math.max(Number(form.get("variants") ?? 2) || 2, 1), 4);
  const photo = form.get("photo");
  if (!name) return bad("Product name is required.");
  if (!description) return bad("A short description is required.");
  if (!Number.isFinite(price) || price <= 0) return bad("Price must be a positive number.");
  if (marginPct !== undefined && (!Number.isFinite(marginPct) || marginPct < 0 || marginPct >= 100)) return bad("Target margin must be between 0 and less than 100%.");
  if (!MARKETPLACES.some((m) => m.id === marketplace)) return bad("Unknown marketplace.");
  if (angles.length === 1) return bad("Give 2 to 4 angles, or leave it empty for the defaults.");
  if (!(photo instanceof File) || photo.size === 0) return bad("A product photo is required.");
  if (photo.size > 8 * 1024 * 1024) return bad("Photo must be 8 MB or less.");
  const ext = photo.type === "image/png" ? "png" : photo.type === "image/jpeg" ? "jpg" : null;
  if (!ext) return bad("Photo must be JPG or PNG.");
  const campaign = await createCampaign({
    name,
    description,
    price,
    marginPct,
    marketplace,
    category,
    angles: angles.length ? angles : DEFAULT_ANGLES,
    photo: { bytes: Buffer.from(await photo.arrayBuffer()), ext },
  });
  const dry = form.get("dry") === "1";
  const jobId = await startJob({ kind: "round", campaignId: campaign.id, round: "r1", n, dry });
  return NextResponse.json({ campaignId: campaign.id, round: "r1", jobId }, { status: 202 });
}
