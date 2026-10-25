# Live demo contract (Cal Hacks judging)

Audience: Cal Hacks 13 judges. All UI text in **English**. The demo case is **Shopee Brazil only** (any product);
generated listings are pt-BR, analysis text (hypothesis, benchmark, rationale, analyst diff) is English.
Other marketplaces are a scale argument (one config entry + one Apify actor), not built.

Judges sit at our laptop (`LISTING_LOOP_LIVE=1 npm run dev` in `app/`) and run both Factory droids on a product
they choose. Vercel serves the same app in replay mode (no live buttons; recorded runs replay instead).

## Storage

- Case study (real data, already recorded): DNT top cropped on Shopee BR = `runs/r1`, `runs/r2` (legacy layout).
  Exposed as campaign id `dnt-top-cropped` (kind `case`).
- Live campaigns: `runs/campaigns/<campaignId>/`
  - `campaign.json` = `{ id, createdAt, product: { name, description, price, currency, sku, category }, marketplace, angles: string[] }`
  - `photo.jpg` (reference photo uploaded by the judge)
  - `<round>/` (`r1`, `r2`, ...) with the same files as legacy rounds: `plan.json`, `intel.json`, `variants/vNN.json`,
    `covers/vNN.png`, `summary.json`, `usage.json`
- Jobs: `runs/jobs/<jobId>/events.jsonl` (one JSON event per line, append-only) + `job.json`.

## API (implemented by the backend owner in `app/src/app/api/`)

`GET /api/lab/status`
```json
{ "live": true, "budget": { "used": 31, "cap": 80 }, "droidVersion": "0.249.0",
  "models": { "conductor": "claude-haiku-5-5", "producer": "claude-haiku-5-5", "analyst": "claude-opus-5-5" },
  "marketplaces": [ { "id": "shopee_br", "label": "Shopee Brazil", "currency": "BRL", "language": "pt-BR", "titleMax": 120 } ] }
```

`POST /api/lab/campaigns` (multipart/form-data): `name`, `description`, `price` (number), `marketplace` (id),
`category` (optional), `angles` (optional, comma-separated, 2–4 values; default derived by backend),
`variants` (1–4, default 2), `photo` (jpg/png, required).
-> `202 { "campaignId": "...", "round": "r1", "jobId": "..." }`. `403` when not live. `409` if a job is already running.

`POST /api/lab/campaigns/:id/rounds` -> next round for an existing live campaign (plans from the updated playbook).
-> `202 { campaignId, round, jobId }`

`POST /api/lab/learn` body `{}` -> runs the `performance-analyst` droid NOW on the DNT store's real 30-day data
(`runs/r2/stats.json`), dry-run: validates the diff and shows it, does not commit memory. -> `202 { jobId }`

`GET /api/lab/jobs/:jobId/stream` (SSE). On connect it replays every event since the start, then tails.
Each SSE `data:` is one event; every event has `t` (ms since job start) and `type`:
- `{ type: "stage", stage: "apify"|"intel"|"plan"|"producer"|"validate"|"analyst"|"memory", status: "start"|"ok"|"error"|"skip", detail?: string }`
- `{ type: "log", source: "system"|"apify"|"plan"|"analyst"|"v01"|"v02"|..., text: string }`
- `{ type: "tool", source: "v01"|"analyst", name: string, detail?: string }`  (droid tool calls: Task, Create, GenerateImage, Read...)
- `{ type: "intel", n: number, query: string, actor: string, headlines: string[] }`
- `{ type: "plan", variants: VariantSpec[] }`  (axes + mode explore/exploit + rationale)
- `{ type: "cover", variantId }`  (cover PNG just appeared on disk)
- `{ type: "variant", variantId, ok: boolean, why?: string, secs: number }`
- `{ type: "diff", diff: MemoryDiff }`
- `{ type: "done", ok: boolean, secs: number, campaignId?: string, round?: string }`
Stream ends after `done`.

`GET /api/campaigns` -> `[{ id, kind: "case"|"live", product: { name, price, currency }, marketplace, photoUrl, createdAt, rounds: [{ round, planned, generated }] }]`

`GET /api/campaigns/:id/rounds/:round` -> `RoundData` (same shape as today's `/api/round/:round`).
`GET /api/campaigns/:id/rounds/:round/cover/:vid` -> PNG. `GET /api/campaigns/:id/photo` -> image.

Axes values are now plain strings (angles depend on the product). `capa` for new products is one of
`solo`, `modelo`, `uso`; the DNT case keeps `solo_grade`, `solo_linha`, `modelo`, `uso`.
Aquisicao: `organico`, `ads`, `afiliado`. `oferta` is a free string (e.g. `kit4`, `single`).

## Front routes

- `/` Overview for judges: what it is, the loop, the two droids, file contracts, "Built with" (tracks), CTAs.
- `/lab` Live Lab (form -> live terminal + cards -> run analyst). In replay mode: replays a recorded job.
- `/campaigns`, `/campaigns/[id]` campaigns (product × marketplace × rounds).
- Case study (existing paths kept): `/rodada/r1`, `/rodada/r2`, `/benchmark/r1`, `/aprendizado`.

## v2 (evidence + sponsor attribution)

Every event now has `by`: `apify` | `factory` | `claude` | `code` | `system` — who is acting. Old recorded jobs
lack it: map `stage apify`/`intel` → apify, `tool`/`variant`/`[session]`/`[result]` → factory, model text/`diff`/`cover` → claude,
`plan`/`memory`/`intel` math/`validate` → code.

New/extended events:
- `{ type: "memory", version, commit: { hash, subject, date } | null, scope: { category, channel }, totalRules,
    rules: [{ id, axis, value, effect, confidence, evidence: { n, mean, ci90, pBetter } }], source }` — emitted before `plan`.
  Only `category=tops` on Shopee has rules in scope (DNT's real feedback data); other products start cold.
- `intel` adds `runId`, `datasetId`, `secs`, `cached?` (path when the live scrape was empty), `top: [{ itemId, title, price, sold, url }]`.
- `variant` adds `sessionId`, `attempts`, `factoryCredits`, `models: { conductor, producer }`.
- `log` lines with `source: "plan"` (by code) state each variant's mode and rationale and the Thompson summary.
- `log` lines with `source: "apify"` show the actor call and the run/dataset ids.

The form must send `category` (e.g. `tops`). Tops campaigns plan on the case's cover values
(`solo_grade`, `solo_linha`, `modelo`, `uso`) and offer `kit4`, so learned rules apply.
