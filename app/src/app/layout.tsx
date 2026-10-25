import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { live } from "@/lib/fsdata";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Listing Loop · Cal Hacks 13",
    template: "%s · Listing Loop",
  },
  description:
    "Two Factory droids run an iterative listing campaign for any product a small seller launches on Shopee: generate variants, measure, learn, reallocate.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Shell live={live}>{children}</Shell>
      </body>
    </html>
  );
}
