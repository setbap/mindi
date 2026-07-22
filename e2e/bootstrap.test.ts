import { expect, test } from "@playwright/test";

test("first launch creates a persisted Untitled Map", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();
  await expect(page.getByText("Empty")).toBeVisible();

  const openMapId = await page.locator("dd.font-mono").textContent();
  expect(openMapId).toBeTruthy();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();
  await expect(page.locator("dd.font-mono")).toHaveText(openMapId!);
});
