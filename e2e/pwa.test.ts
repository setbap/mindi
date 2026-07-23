import { expect, test } from "@playwright/test";
import { readdir } from "node:fs/promises";

test("production build precaches the SPA shell and manifest assets", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const manifestJson = await manifest.json();
  expect(manifestJson.display).toBe("standalone");
  expect(manifestJson.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
    ]),
  );

  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBe(true);
  const workerSource = await worker.text();
  expect(workerSource).toContain("index.html");
  expect(workerSource).toContain("manifest.webmanifest");
  expect(workerSource).toContain("NavigationRoute");

  const productionFiles = (await readdir("dist", { recursive: true }))
    .filter((path) => path.includes("."))
    .filter((path) => path !== "sw.js" && !path.startsWith("workbox-"));
  for (const path of productionFiles) {
    expect(workerSource, `${path} is precached`).toContain(path);
  }
});

test("installed shell launches deep-linked offline and keeps Map CRUD local", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  await page.goto("/offline-release-check");
  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.type("Offline root");
  await page.keyboard.press("Enter");
  await canvas.focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await page.keyboard.type("Offline child");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Detach" }).click();

  await page.getByRole("button", { name: "Maps" }).click();
  await page.getByRole("button", { name: "Create Map" }).click();
  const catalog = page.getByRole("list", { name: "Map catalog" });
  await catalog
    .getByRole("listitem")
    .nth(1)
    .getByRole("button", { name: "Rename" })
    .click();
  const rename = page.getByLabel(/Rename Untitled Map/i);
  await rename.fill("Offline Map");
  await rename.press("Enter");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Offline Map" }),
  ).toBeVisible();
  await canvas.focus();
  await page.keyboard.type("Transfer note");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Maps" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Map" }).click();
  const exported = await download;
  const exportedPath = await exported.path();
  expect(exportedPath).not.toBeNull();

  await page.locator('input[type="file"]').setInputFiles(exportedPath!);
  await page.getByRole("button", { name: "Import selected" }).click();
  await expect(catalog.getByRole("listitem")).toHaveCount(3);
  await catalog
    .getByRole("listitem")
    .filter({ hasText: "Offline Map (imported)" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(catalog.getByRole("listitem")).toHaveCount(2);
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offline Map" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("safe-markdown").filter({ hasText: "Transfer note" }),
  ).toBeVisible();
});
