# Fox.ai: 3-minute demo video script

**Format:** one screen recording of the real app running live (`LISTING_LOOP_LIVE=1`), voiceover on top, cut and sped up in editing.
**Rule:** about 70% of the runtime shows the product working. The architecture is explained *while the droids are running*, so the waiting time becomes airtime.
**Voiceover budget:** about 420 words at about 140 wpm. Every VO line below is timed to fit.

---

## Before you hit record

```sh
cd app && LISTING_LOOP_LIVE=1 npm run dev    # or: npm run demo
```

- [ ] **Close `.env` in VS Code.** It is open with the Apify token selected. It must never appear on screen. Also rotate that key after the hackathon.
- [ ] Browser: one window, 1920×1080, zoom 110–125%, bookmarks bar hidden, notifications off (macOS Focus mode on).
- [ ] Factory CLI authenticated, `runs/budget.json` has sessions left (each run uses 2 producer sessions + 1 analyst session).
- [ ] Do one full dry run first so the Apify cache is warm. If Apify fails during the take, the stage falls back to cache and says so; that is fine to show.
- [ ] Record **separate clips** (easier to edit): A) home + architecture, B) the full live run without stopping, C) Learning page, D) your face/intro (optional).
- [ ] Record mic audio separately or speak the VO afterwards. The droids take ~2 min, so live narration will not line up anyway.

---

## The script

| Time | Section | On screen (what you do) | Voiceover |
| --- | --- | --- | --- |
| **0:00–0:15** | **Hook: the problem** | Home page `/`, hero "Your next listing. Smarter every round." Slow scroll. Optional: 2s flash of the real Shopee search results page full of near-identical top cropped listings. | "A small seller on Shopee launches a product and has one shot at the listing: the title, the cover, the price, the ad strategy. They spend days on it, guess once, and never learn why it worked or didn't." |
| **0:15–0:30** | **Problem, sharper** | Stay on home, cursor over "Two droids. One continuous experiment." | "Traction on a marketplace is high variance. Going narrow with one listing leaves money on the table. What a seller actually needs is an experiment: many listings, real market data, and a memory of what sold." |
| **0:30–0:45** | **Founding team / why us** | Optional face cam clip (D), or the `/aprendizado` page with "DNT" visible. Lower third: names + roles. | "We're [NAME] and [NAME]. We run DNT, a Brazilian fashion brand selling on Shopee, so we built Fox.ai on our own products and our own sales data. Every number you'll see comes from a real store." |
| **0:45–1:00** | **Live demo: start** | `/lab` → **"Use the DNT case product"** → show photo, title, keywords → click **Run droids** (2 variants). | "Here's Fox.ai running live. I give it one product: a photo, a title, a price. And I hit run." |
| **1:00–1:15** | **Apify stage** | Apify badge lights up: actor `xtracto/shopee-search`, run ID, dataset ID, "N competitors benchmarked", top 5 with links. **Zoom in** on the run ID and click one competitor link. | "First, an Apify actor scrapes Shopee Brazil in real time. That's a real run ID. These are real competitor listings, with prices, sales and title keywords, so every claim our listings make is grounded and checkable." |
| **1:15–1:30** | **Memory + plan** | Feedback memory panel: playbook v2, commit hash, rules with n / P(better) / CI90. Then the plan: v01 **EXPLOIT**, v02 **EXPLORE**. Zoom on the badges. | "Next, it reads the store's memory: rules learned from past sales, each with evidence and a confidence score. Thompson sampling then decides what to test: one variant exploits what already sells, one explores something new." |
| **1:30–2:05** | **Factory droids running (architecture told here)** | Producer stage: two Factory sessions in parallel, session IDs, `Task → listing-producer`. **Speed ramp 4–6×** over the waiting. Cut away to `/architecture` for ~15s, then back. | "Now Factory takes over. A Droid SDK conductor spins up one custom droid per variant, each in its own session, in parallel. We picked Factory because droids are defined as files in the repo, so they're versioned, reproducible and easy to give their own model. Different jobs get different models: Claude Haiku writes each listing fast, an image model renders the cover from the real product photo, and Claude Opus does the hard reasoning on sales data. Anthropic runs through the whole loop: writing, analysis, and the decisions about what to learn." |
| **2:05–2:30** | **Results: the money shot** | "Your listings are ready." Open a card: title, description, **cover image**, benchmark (price vs median, cited competitor IDs), acquisition strategy, memory rules used. Show the second card's different cover. | "Two complete listings, each with a different strategy. Title, description, a cover generated from our actual product, and a benchmark against real competitors. Zod checks every output: if a droid invents a competitor, the listing gets rejected." |
| **2:30–2:50** | **The loop closes** | Click **Run performance-analyst**. Speed ramp. Playbook diff appears: rules confirmed, rules retired with reason `enoughData=false`. Optional 3s cut to `/aprendizado` showing r1 → r2. | "And here's the loop. The performance analyst, a second Factory droid on Claude Opus, reads 14 real DNT listings and rewrites the playbook. Real sales overturned three rules we'd learned from simulated data. The next round starts smarter." |
| **2:50–3:00** | **Close** | Back to home hero, logo + Lo, Fox and Spark. End card: **Fox.ai**, plus the logos Anthropic · Factory · Apify · Figma. | "Fox.ai. Better listings, and a smarter next round, every round." |

---

## Lines you must keep (one per sponsor)

If you trim, keep these lines:

- **Problem:** "one shot at the listing... never learn why it worked."
- **Team:** "We run DNT... our own sales data."
- **Apify:** "a real run ID... every claim is grounded and checkable."
- **Factory:** "one custom droid per variant, in parallel... droids are files in the repo, each with its own model."
- **Anthropic:** "Haiku writes, Opus reasons on sales data... Anthropic runs through the whole loop."
- **Proof:** "Real sales overturned three rules."

## Honesty guardrails (judges will check)

- The listing-generation run is **live**. The analyst runs as a **dry-run** on DNT's 14 real historical listings; it does not commit memory. Don't say "it learned from the listings it just made": those have no sales yet.
- Nothing is published to Shopee. If you mention it, say "the seller approves every listing."
- The cover image model is ChatGPT (image generation), not Claude. Say "an image model" or name it; don't credit it to Anthropic.
- Speed ramps are fine, but put a small on-screen label: **"⏩ 4× — real run took 2m10s"**.

---

## Brief for the editor (paste this into Claude with the recordings)

> You're editing a 3:00 hackathon demo video for **Fox.ai** (Cal Hacks 13). Audience: judges for the Anthropic, Factory and Apify tracks. Use the attached script (`DEMO_VIDEO_SCRIPT.md`) as the timeline and the attached screen recordings as footage.
>
> - Hard cap **3:00**. Match each VO line to the clip described in the "On screen" column.
> - Speed-ramp every wait (Apify fetch, droid sessions, analyst) to 4–6× and add a small "⏩ N× · real time Xs" label.
> - Zoom/punch-in (120–150%) on: the Apify run ID, the EXPLOIT/EXPLORE badges, the Factory session IDs, the generated cover, and the playbook diff.
> - Add a small sponsor badge in a corner during each stage: APIFY (1:00–1:15), FACTORY (1:30–2:05), ANTHROPIC (1:30–2:05 and 2:30–2:50).
> - Lower third at 0:30 with team names and "Founders of DNT, Shopee seller".
> - Captions on for the whole video (burned in, high contrast). Many judges watch muted.
> - Clean, product-first look: no stock footage, no transitions longer than 0.3s, light background music at -24 dB under the VO.
> - Blur anything that looks like a token, key or email address.
