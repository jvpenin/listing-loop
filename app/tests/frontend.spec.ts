import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";
const approvalFile = process.env.VERCEL ? "/tmp/listing-loop/.data/approvals.json" : path.resolve(".data/approvals.json");
let original: string | null = null;
test.beforeAll(async () => {
  original = await fs.readFile(approvalFile, "utf8").catch(() => null);
  await fs.mkdir(".design-preview", { recursive: true });
});
test.afterAll(async () => {
  if (original !== null) await fs.writeFile(approvalFile, original);
  else await fs.rm(approvalFile, { force: true });
});
test("judges land in the demo and can open the architecture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".lab-form")).toBeVisible();
  await expect(page.getByRole("img", { name: "Lo, the Fox.ai mascot" })).toBeVisible();
  await expect(page.getByLabel("Product title")).toHaveValue("Kit 4 Top Cropped Sem Bojo");
  await expect(page.getByAltText("Product reference preview")).toBeVisible();
  await expect(page.getByLabel("Upload a product reference photo")).toHaveCSS("opacity", "0");
  await expect.poll(() => page.getByAltText("Product reference preview").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("complementary", { name: "Workspace" })).toBeVisible();
  const navBox = await page.getByRole("complementary", { name: "Workspace" }).boundingBox();
  expect(navBox?.x).toBe(0);
  await expect(page.locator(".engine-term, .lab-term")).toHaveCount(0);
  await page.screenshot({ path: ".design-preview/01-demo-desktop.png", animations: "disabled", fullPage: true });
  await page.locator('nav a[href="/architecture"]').click();
  await expect(page).toHaveURL("/architecture");
  await expect(page.getByText("listing-producer", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("performance-analyst", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Architecture map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Architecture map" }).getByText("Product brief", { exact: true })).toBeVisible();
  await expect(page.getByText("Updated memory feeds the next experiment plan.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inside each stage." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Fox, the creative producer" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Spark, the analyst" })).toBeVisible();
  await page.screenshot({ path: ".design-preview/07-architecture-desktop.png", animations: "disabled", fullPage: true });
});
test("revisão salva aprovação e rejeição, filtra e abre detalhes acessíveis", async ({
  page,
}) => {
  await page.goto("/rodada/r1");
  await page.getByRole("button", { name: "Approve v01", exact: true }).click();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-approved/,
  );
  await expect(page.getByRole("status")).toContainText("saved");
  await page.reload();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-approved/,
  );
  await page.getByRole("button", { name: "Approved", exact: true }).click();
  await expect(page.locator(".variant-card.is-approved")).toHaveCount(
    await page.locator(".variant-card").count(),
  );
  await page
    .getByRole("button", { name: "All", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: /Open v01:/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Listing copy" }),
  ).toBeVisible();
  await expect(
    page.locator('.listing-drawer a[href*="shopee.com.br"]'),
  ).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Reject v01", exact: true })
    .click();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-rejected/,
  );
  await expect(page.getByRole("status")).toContainText("Rejected");
  await page.reload();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-rejected/,
  );
  await page.screenshot({
    path: ".design-preview/02-anuncios-desktop.png",
    animations: "disabled", fullPage: true,
  });
});
test("rodada parcial distingue os quatro anúncios gerados dos planejados", async ({
  page,
}) => {
  await page.goto("/rodada/r2");
  await expect(page.locator(".variant-card")).toHaveCount(12);
  await expect(page.locator(".variant-cover img")).toHaveCount(4);
  await expect(page.getByText("Not generated in this run.", { exact: true })).toHaveCount(
    8,
  );
});
test("mercado alterna abordagens mantendo fontes reais", async ({ page }) => {
  await page.goto("/benchmark/r1");
  await expect(page.locator(".kpi").first()).toContainText("179");
  const before = await page.locator("tbody tr").first().textContent();
  await page.getByRole("button", { name: /Casual/ }).click();
  await expect(page.locator("tbody tr").first()).not.toHaveText(before!);
  await expect(page.locator('tbody a[href*="shopee.com.br"]')).not.toHaveCount(
    0,
  );
  await page.screenshot({
    path: ".design-preview/03-mercado-desktop.png",
    animations: "disabled", fullPage: true,
  });
});
test("aprendizado mostra mudanças reais, incerteza, memória e comparação", async ({
  page,
}) => {
  await page.goto("/aprendizado");
  await expect(
    page.getByText("14 real DNT listings.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-hero h2")).toContainText(
    "Real data arrived",
  );
  await expect(page.locator(".rule-change s")).toHaveCount(3);
  await expect(page.locator(".ci-plot")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Cover style", exact: true })
    .click();
  await expect(page.locator(".ci-row")).toHaveCount(3);
  await expect(page.locator(".ci-plot")).toHaveCount(2);
  await expect(page.locator(".ci-no-data")).toContainText("Inconclusive");
  await page
    .getByRole("button", { name: "Acquisition", exact: true })
    .click();
  await expect(page.locator(".ci-no-data")).toContainText("Inconclusive");
  await page.getByRole("button", { name: "Angle", exact: true }).click();
  await expect.poll(() => page.locator(".history-grid img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({
    path: ".design-preview/04-aprendizado-desktop.png",
    animations: "disabled", fullPage: true,
  });
  await page.locator("main").getByRole("link", { name: "Round 1", exact: true }).click();
  await expect(
    page.getByText("Demo base: 3 real + 12 simulated listings.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".playbook")).toContainText("Playbook v1");
});
test("APIs bloqueiam agentes, validam entradas e reproduzem arquivos", async ({
  request,
}) => {
  const live = await request.post("/api/round", { data: { round: "r9999" } });
  expect(live.status()).toBe(403);
  for (const endpoint of ["/api/lab/campaigns", "/api/lab/learn", "/api/lab/campaigns/dnt-top-cropped/rounds"]) {
    const blocked = await request.post(endpoint, { data: {} });
    expect(blocked.status(), endpoint).toBe(403);
  }
  const bad = await request.post("/api/variant/r1/v01/approve", {
    data: { approved: "yes" },
  });
  expect(bad.status()).toBe(400);
  const missing = await request.post("/api/variant/r1/v99/approve", {
    data: { approved: true },
  });
  expect(missing.status()).toBe(404);
  const cover = await request.get("/api/round/r1/cover/v01");
  expect(cover.headers()["content-type"]).toBe("image/png");
  const stream = await request.get("/api/round/r1/stream");
  const body = await stream.text();
  expect((body.match(/"variantId"/g) ?? []).length).toBe(12);
  expect(body).toContain("event: done");
});
test("telas funcionam no celular sem rolagem lateral", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of [
    ["/", "01-demo"],
    ["/architecture", "07-architecture"],
    ["/lab", "05-live-demo"],
    ["/rodada/r1", "02-anuncios"],
    ["/benchmark/r1", "03-mercado"],
    ["/aprendizado", "04-aprendizado"],
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll("main *"))
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
        })),
    }));
    expect(
      overflow.scroll,
      JSON.stringify({ route, ...overflow }),
    ).toBeLessThanOrEqual(overflow.width);
    await page.screenshot({
      path: `.design-preview/${name}-mobile.png`,
      animations: "disabled", fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.locator('nav a[href="/architecture"]')).toBeVisible();
  await page.locator('nav a[href="/"]').click();
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL("/");
});

test("live form keeps the DNT defaults, validates margin, streams listings and runs the analyst", async ({ page, request }) => {
  const data = await (await request.get("/api/round/r1")).json();
  const variants = data.plan.variants.slice(0, 2);
  const status = {
    live: true, budget: { used: 47, cap: 80 }, droidVersion: "0.249.0",
    models: { conductor: "claude-haiku-5-5", producer: "claude-haiku-5-5", analyst: "claude-opus-5-5" },
    marketplaces: [{ id: "shopee_br", label: "Shopee Brazil", currency: "BRL", language: "pt-BR", titleMax: 120 }],
  };
  await page.route("**/api/lab/status", route => route.fulfill({ json: status }));
  let posted = "";
  await page.route("**/api/lab/campaigns", async route => {
    posted = route.request().postDataBuffer()?.toString() ?? "";
    await route.fulfill({ status: 202, json: { campaignId: "dnt-top-cropped", round: "r1", jobId: "test-round" } });
  });
  const events = [
    { type: "stage", stage: "apify", status: "ok", detail: "Live scrape complete" },
    { type: "intel", n: 20, query: "Kit 4 Top Cropped Sem Bojo", actor: "xtracto/shopee-search", runId: "test-run", datasetId: "test-dataset", headlines: ["Market benchmark ready"], top: [{ itemId: "123", title: "Competitor top", price: 49.90, sold: 120, url: "https://shopee.com.br/product/1/123" }] },
    { type: "plan", variants },
    ...variants.flatMap((v: { variantId: string }) => [{ type: "cover", variantId: v.variantId }, { type: "variant", variantId: v.variantId, ok: true, secs: 120 }]),
    { type: "done", ok: true, secs: 130, campaignId: "dnt-top-cropped", round: "r1" },
  ];
  await page.route("**/api/lab/jobs/test-round/stream", route => route.fulfill({ contentType: "text/event-stream", body: events.map((e, i) => `data: ${JSON.stringify({ t: i * 10, ...e })}\n\n`).join("") }));
  await page.route("**/api/lab/learn", route => route.fulfill({ status: 202, json: { jobId: "test-learn" } }));
  await page.route("**/api/lab/jobs/test-learn/stream", route => route.fulfill({ contentType: "text/event-stream", body: [
    { t: 0, type: "diff", diff: { add: [], update: [], retire: [], inconclusive: [], summary: "The analyst kept exploring because there is not enough evidence." } },
    { t: 10, type: "done", ok: true, secs: 55 },
  ].map(e => `data: ${JSON.stringify(e)}\n\n`).join("") }));
  await page.goto("/");
  await expect(page.getByLabel("Product title")).toHaveValue("Kit 4 Top Cropped Sem Bojo");
  await expect(page.getByLabel("Key product facts")).not.toBeEmpty();
  await expect(page.getByAltText("Product reference preview")).toBeVisible();
  await expect(page.getByLabel("Upload a product reference photo")).toHaveCSS("opacity", "0");
  await expect.poll(() => page.getByAltText("Product reference preview").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByLabel("Keywords to test")).toHaveValue("academia, casual, conforto, presente");
  await expect(page.getByText("Separate 2–4 audiences or uses with commas.", { exact: false })).toBeVisible();
  await expect(page.locator(".lab-pipeline, .judge-engine-strip")).toHaveCount(0);
  const generate = page.getByRole("button", { name: "Generate 2 listings", exact: true });
  await expect(generate).toHaveCSS("background-color", "rgb(50, 105, 232)");
  const cta = await generate.boundingBox();
  expect(cta).not.toBeNull();
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: ".design-preview/05-live-demo-desktop.png", animations: "disabled", fullPage: true });
  await page.getByText("Product details & pricing", { exact: false }).click();
  const margin = page.getByLabel(/Target margin/);
  await margin.fill("100");
  await page.getByRole("button", { name: "Generate 2 listings", exact: true }).click();
  await expect(page.locator(".lab-form").getByRole("alert")).toContainText("Target margin");
  expect(posted).toBe("");
  await margin.fill("35");
  await page.getByRole("button", { name: "Generate 2 listings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your listings are ready." })).toBeVisible();
  expect(posted).toContain('name="marginPct"\r\n\r\n35');
  expect(posted).toContain('name="category"\r\n\r\ntops');
  expect(posted).toContain('name="variants"\r\n\r\n2');
  expect(posted).toContain('name="angles"\r\n\r\nacademia,casual,conforto,presente');
  expect(posted).toContain('name="photo"');
  await expect(page.locator(".lab-card.ok")).toHaveCount(2);
  await expect(page.locator(".engine-term, .lab-term")).toHaveCount(0);
  await expect(page.locator(".lab-card h4").first()).toHaveText(data.variants[0].title);
  await page.screenshot({ path: ".design-preview/08-generated-desktop.png", animations: "disabled", fullPage: true });
  await page.getByText("See competitors & scrape evidence", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Competitor top" })).toHaveAttribute("href", /shopee.com.br/);
  await expect(page.getByText("test-run", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run the analyst", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What the analyst would change" })).toBeVisible();
  await expect(page.locator(".lab-diff-summary")).toContainText("not enough evidence");
});

test("a busy engine returns a clear error without starting a stream", async ({ page }) => {
  await page.route("**/api/lab/status", route => route.fulfill({ json: { live: true, models: {}, marketplaces: [] } }));
  await page.route("**/api/lab/campaigns", route => route.fulfill({ status: 409, json: { error: "A droid job is already running. Wait for it to finish." } }));
  await page.goto("/");
  await expect(page.getByAltText("Product reference preview")).toBeVisible();
  await expect(page.getByLabel("Upload a product reference photo")).toHaveCSS("opacity", "0");
  await expect.poll(() => page.getByAltText("Product reference preview").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Generate 2 listings", exact: true }).click();
  await expect(page.locator(".lab-form").getByRole("alert")).toContainText("already running");
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Use my product" }).click();
  await expect(page.getByLabel("Product title")).toBeEmpty();
  await expect(page.getByLabel("Key product facts")).toBeEmpty();
  await expect(page.getByAltText("Product reference preview")).toHaveCount(0);
  await expect(page.locator(".judge-settings")).toHaveAttribute("open", "");
  await expect(page.getByLabel("Product category")).toBeEmpty();
  await expect(page.getByLabel("Keywords to test")).toBeEmpty();
});


test("recorded demo replays a real saved run through completion", async ({ page }) => {
  test.setTimeout(45000);
  await page.goto("/lab");
  await expect(page.getByAltText("Product reference preview")).toBeVisible();
  await expect(page.getByLabel("Upload a product reference photo")).toHaveCSS("opacity", "0");
  await expect.poll(() => page.getByAltText("Product reference preview").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByLabel("Product title")).toBeDisabled();
  await expect(page.getByRole("heading", { name: /Your listings are ready.|Run finished. Review the results./ })).toBeVisible({ timeout: 35000 });
  await expect(page.locator(".lab-card.ok")).not.toHaveCount(0);
  await page.screenshot({ path: ".design-preview/06-replay-complete-desktop.png", animations: "disabled", fullPage: true });
});

test("returning to the demo reconnects to the active job", async ({ page }) => {
  await page.route("**/api/lab/status", route => route.fulfill({ json: {
    live: true, models: {}, marketplaces: [], runningJobId: "test-active",
  } }));
  let connected = false;
  await page.route("**/api/lab/jobs/test-active/stream", route => {
    connected = true;
    return route.fulfill({ contentType: "text/event-stream", body: `data: ${JSON.stringify({ t: 0, type: "stage", stage: "producer", status: "start" })}\n\n` });
  });
  await page.goto("/architecture");
  await page.locator('nav a[href="/"]').click();
  await expect.poll(() => connected).toBe(true);
  await expect(page.getByRole("heading", { name: "The droids are working…" })).toBeVisible();
  await expect(page.getByLabel("Product title")).toBeDisabled();
});
