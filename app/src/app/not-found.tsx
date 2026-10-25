import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound() {
  return (
    <section className="empty">
      <SearchX size={28} />
      <h1>Not found.</h1>
      <p>This round or page does not exist. Go back to the overview.</p>
      <Link className="button primary" href="/">
        Back to overview
      </Link>
    </section>
  );
}
