import { chromium } from "playwright";

const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(webUrl, { waitUntil: "networkidle" });
    await page.getByText("Find the watch that stays with you.").waitFor();

    const cards = page.locator('a[href^="/listings/"]');
    const images = page.locator("img");
    const cardCount = await cards.count();
    const loadedImageCount = await images.evaluateAll(
      (elements) =>
        elements.filter((image) => image.complete && image.naturalWidth > 0)
          .length,
    );
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    if (cardCount === 0 || loadedImageCount === 0 || hasHorizontalOverflow) {
      throw new Error(
        `${viewport.name} marketplace smoke check failed: cards=${cardCount}, loadedImages=${loadedImageCount}, horizontalOverflow=${hasHorizontalOverflow}`,
      );
    }

    await page.getByLabel("Search the collection").fill("Rolex");
    await page.waitForURL(/search=Rolex/);
    console.log(
      `${viewport.name}: cards=${cardCount}, loadedImages=${loadedImageCount}, search=PASS, horizontalOverflow=false`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
