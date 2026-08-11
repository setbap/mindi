import { expect, test } from "@playwright/test";

test("Persian chrome is RTL with sidebar on the right and LTR Map canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await page.getByTestId("language-select").selectOption("fa");
  await expect(page.getByTestId("app-shell")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("app-shell")).toHaveAttribute("lang", "fa");
  await expect(page.getByRole("button", { name: "مدیریت نقشه‌ها" })).toBeVisible();

  const browser = page.getByTestId("map-node-browser");
  const canvas = page.getByTestId("map-canvas");
  await expect(canvas).toBeVisible();
  await expect(browser).toBeVisible();

  const browserBox = await browser.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(browserBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  // Sidebar sits to the right of the Map canvas; canvas geometry stays LTR.
  expect(browserBox!.x).toBeGreaterThan(canvasBox!.x);

  const canvasDir = await canvas.evaluate((el) => {
    const host = el.closest("[dir]") ?? el.parentElement;
    return getComputedStyle(host!).direction;
  });
  expect(canvasDir).toBe("ltr");
  await expect(page.locator('[dir="ltr"]').filter({ has: canvas })).toHaveCount(
    1,
  );

  await page.reload();
  await expect(page.getByTestId("language-select")).toHaveValue("fa");
  await expect(page.getByTestId("app-shell")).toHaveAttribute("dir", "rtl");
});

test("mobile action chrome exposes undo redo create and node browser sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const bar = page.getByTestId("mobile-action-bar");
  await expect(bar).toBeVisible();
  await expect(bar.getByTestId("mobile-create-child")).toBeVisible();
  await expect(bar.getByTestId("mobile-create-sibling")).toBeVisible();
  await expect(bar.getByTestId("mobile-focused-pill")).toBeVisible();
  await expect(bar.getByTestId("mobile-open-structure")).toBeVisible();
  await expect(bar.getByTestId("mobile-open-style")).toBeVisible();

  await expect(page.getByTestId("mobile-undo")).toBeVisible();
  await expect(page.getByTestId("mobile-redo")).toBeVisible();
  await expect(page.getByTestId("map-title")).toBeVisible();

  // Structure commands live in the Structure+App drawer, not the bar.
  await expect(bar.getByTestId("structure-commands")).toHaveCount(0);
  await page.getByTestId("mobile-open-structure").click();
  const structureDrawer = page.getByTestId("mobile-structure-drawer");
  await expect(structureDrawer).toBeVisible();
  await expect(structureDrawer.getByTestId("structure-commands")).toBeVisible();
  await expect(
    structureDrawer.getByRole("button", { name: "Create Root" }),
  ).toBeVisible();
  await expect(structureDrawer.getByTestId("language-select")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(structureDrawer).toBeHidden();

  await page.getByTestId("mobile-focused-pill").click();
  const browserDrawer = page.getByTestId("mobile-browser-drawer");
  await expect(browserDrawer).toBeVisible();
  await expect(browserDrawer.getByTestId("map-node-browser")).toBeVisible();
  await browserDrawer.getByRole("treeitem").first().click();
  await expect(browserDrawer).toBeHidden();

  // Emulate on-screen keyboard shrinking the visual viewport.
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="app-shell"]');
    root?.style.setProperty("--visible-viewport-height", "480px");
  });
  await expect(bar).toBeVisible();
  await expect(page.getByLabel("Node markdown").or(bar)).toBeVisible();
  const shellHeight = await page
    .getByTestId("app-shell")
    .evaluate((el) => getComputedStyle(el).blockSize);
  expect(shellHeight).toBe("480px");
});
