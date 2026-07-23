import { expect, test } from "@playwright/test";

test("Map manager create rename switch and delete persist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Maps" }).click();
  await expect(page.getByTestId("map-manager-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Create Map" }).click();

  const catalog = page.getByRole("list", { name: "Map catalog" });
  await expect(catalog.getByRole("listitem")).toHaveCount(2);

  await catalog
    .getByRole("listitem")
    .nth(1)
    .getByRole("button", { name: "Rename" })
    .click();
  const rename = page.getByLabel(/Rename Untitled Map/i);
  await rename.fill("Notes");
  await rename.press("Enter");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();

  await page.getByRole("button", { name: "Maps" }).click();
  await catalog
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: "Switch" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Maps" }).click();
  await catalog
    .getByRole("listitem")
    .nth(1)
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(catalog.getByRole("listitem")).toHaveCount(1);
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Maps" }).click();
  await expect(
    page.getByRole("list", { name: "Map catalog" }).getByRole("listitem"),
  ).toHaveCount(1);
});

test("Map manager uses a Sheet on mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Maps" }).click();
  await expect(page.getByTestId("map-manager-sheet")).toBeVisible();
});
