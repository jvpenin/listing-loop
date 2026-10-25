import { chromium } from "@playwright/test";
import path from "node:path";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1080, height: 840 } });
for (const name of ["screen2", "screen3", "screen4", "wireframe"]) {
  await page.goto(
    "file://" + path.resolve("../claude/design tools/" + name + ".svg"),
  );
  await page.screenshot({ path: ".design-preview/" + name + ".png" });
}
await browser.close();
