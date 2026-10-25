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
test("lançamento apresenta produto real e navega pelo replay", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Você cuida da loja. O Loop cuida dos anúncios.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Lo, seu parceiro" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Custo do kit" })).toHaveValue(
    "R$ 23,40",
  );
  await page.screenshot({
    path: ".design-preview/01-lancamento-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Criar minhas variações" }).click();
  await expect(page.locator(".variant-card")).toHaveCount(12);
  await expect(page.locator(".variant-cover img")).toHaveCount(12, {
    timeout: 15000,
  });
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});
test("revisão salva aprovação e rejeição, filtra e abre detalhes acessíveis", async ({
  page,
}) => {
  await page.goto("/rodada/r1");
  await page.getByRole("button", { name: "Aprovar v01", exact: true }).click();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-approved/,
  );
  await expect(page.getByRole("status")).toContainText("salva");
  await page.reload();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-approved/,
  );
  await page.getByRole("button", { name: "Aprovados", exact: true }).click();
  await expect(page.locator(".variant-card.is-approved")).toHaveCount(
    await page.locator(".variant-card").count(),
  );
  await page
    .getByRole("button", { name: "Todos", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: /Ver detalhes de v01:/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Texto do anúncio" }),
  ).toBeVisible();
  await expect(
    page.locator('.listing-drawer a[href*="shopee.com.br"]'),
  ).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Deixar v01 de fora", exact: true })
    .click();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-rejected/,
  );
  await expect(page.getByRole("status")).toContainText("marcado");
  await page.reload();
  await expect(page.locator(".variant-card").first()).toHaveClass(
    /is-rejected/,
  );
  await page.screenshot({
    path: ".design-preview/02-anuncios-desktop.png",
    fullPage: true,
  });
});
test("rodada parcial distingue os quatro anúncios gerados dos planejados", async ({
  page,
}) => {
  await page.goto("/rodada/r2");
  await expect(page.locator(".variant-card")).toHaveCount(12);
  await expect(page.locator(".variant-cover img")).toHaveCount(4);
  await expect(page.getByText("Ainda no plano", { exact: true })).toHaveCount(
    8,
  );
});
test("mercado alterna abordagens mantendo fontes reais", async ({ page }) => {
  await page.goto("/benchmark/r1");
  await expect(page.locator(".kpi").first()).toContainText("179");
  const before = await page.locator("tbody tr").first().textContent();
  await page.getByRole("button", { name: /Dia a dia/ }).click();
  await expect(page.locator("tbody tr").first()).not.toHaveText(before!);
  await expect(page.locator('tbody a[href*="shopee.com.br"]')).not.toHaveCount(
    0,
  );
  await page.screenshot({
    path: ".design-preview/03-mercado-desktop.png",
    fullPage: true,
  });
});
test("aprendizado mostra mudanças reais, incerteza, memória e comparação", async ({
  page,
}) => {
  await page.goto("/aprendizado");
  await expect(
    page.getByText("14 anúncios reais da DNT.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learning-hero h2")).toContainText(
    "O dado real chegou.",
  );
  await expect(page.locator(".rule-change s")).toHaveCount(3);
  await expect(page.locator(".ci-plot")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Estilo de capa", exact: true })
    .click();
  await expect(page.locator(".ci-row")).toHaveCount(3);
  await expect(page.locator(".ci-plot")).toHaveCount(2);
  await expect(page.locator(".ci-no-data")).toContainText("Inconclusivo");
  await page
    .getByRole("button", { name: "Canal de venda", exact: true })
    .click();
  await expect(page.locator(".ci-no-data")).toContainText("Inconclusivo");
  await page.getByRole("button", { name: "Abordagem", exact: true }).click();
  await expect.poll(() => page.locator(".history-grid img").evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({
    path: ".design-preview/04-aprendizado-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Rodada 1", exact: true }).click();
  await expect(
    page.getByText("Base de demonstração: 3 reais + 12 simulados.", {
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
    ["/", "01-lancamento"],
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
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Novo lançamento" }).click();
  await expect(page).toHaveURL("/");
});
