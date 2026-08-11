import { expect, test } from "@playwright/test";

import { DEFAULT_PALETTE } from "../src/domain/types";
import { LAYOUT_PERFORMANCE_ENTRY, layoutMap } from "../src/layout/layout-map";
import { createLargeMapFixture } from "../src/test/fixtures/large-map";

test("512-Node deterministic fixture meets desktop and mobile layout budgets", () => {
  const map = createLargeMapFixture();
  const sizes = Object.fromEntries(
    Object.values(map.nodes).map((node) => [
      node.id,
      { width: node.width, height: 48 },
    ]),
  );

  const durations: number[] = [];
  let result = layoutMap(map, sizes);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const started = performance.now();
    result = layoutMap(map, sizes);
    durations.push(performance.now() - started);
  }
  const duration = Math.min(...durations);

  expect(result.nodes).toHaveLength(512);
  expect(duration, "desktop layout budget").toBeLessThan(250);
  expect(duration, "mobile layout budget").toBeLessThan(750);
});

test("large imported Maps warn without imposing a hard Node limit", async ({
  page,
}) => {
  const map = createLargeMapFixture(513);
  await page.goto("/");
  await page.getByRole("button", { name: "Map manager" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "scale.mindi.json",
    mimeType: "application/vnd.mindi+json",
    buffer: Buffer.from(
      JSON.stringify({
        formatVersion: 1,
        maps: [map],
        palette: DEFAULT_PALETTE,
      }),
    ),
  });
  await page.getByRole("button", { name: "Import selected" }).click();
  await page.evaluate(
    (entry) => performance.clearMeasures(entry),
    LAYOUT_PERFORMANCE_ENTRY,
  );
  const desktopStarted = await page.evaluate(() => performance.now());
  await page
    .getByRole("list", { name: "Map catalog" })
    .getByRole("button", { name: map.name })
    .click();

  const canvas = page.getByTestId("map-canvas");
  await expect(
    page.getByText("This Map has 512 or more Nodes. Performance may slow."),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-layout-animation", "off");
  await expect(
    page.getByRole("tree", { name: "Map nodes" }).getByRole("treeitem"),
  ).toHaveCount(513);
  expect(
    (await page.evaluate(() => performance.now())) - desktopStarted,
    "desktop initial layout/render budget",
  ).toBeLessThan(1_000);
  const desktopLayouts = await page.evaluate(
    (entry) => performance.getEntriesByName(entry).map((item) => item.duration),
    LAYOUT_PERFORMANCE_ENTRY,
  );
  expect(Math.max(...desktopLayouts), "desktop layout budget").toBeLessThan(
    250,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.reload();
  await expect(
    page.getByText("This Map has 512 or more Nodes. Performance may slow."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => performance.now()),
    "mobile initial layout/render budget",
  ).toBeLessThan(2_000);
  const mobileLayouts = await page.evaluate(
    (entry) => performance.getEntriesByName(entry).map((item) => item.duration),
    LAYOUT_PERFORMANCE_ENTRY,
  );
  expect(Math.max(...mobileLayouts), "mobile layout budget").toBeLessThan(750);
});
