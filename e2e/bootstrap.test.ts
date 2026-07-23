import { expect, test } from "@playwright/test";

test("first launch creates a persisted Untitled Map", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();
  await expect(page.getByTestId("map-forest")).toBeVisible();
  await expect(page.getByText("Start typing…")).toBeVisible();

  const openMapName = await page
    .getByRole("heading", { level: 1 })
    .textContent();
  expect(openMapName).toBe("Untitled Map");

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Untitled Map" }),
  ).toBeVisible();
  await expect(page.getByText("Start typing…")).toBeVisible();
});
