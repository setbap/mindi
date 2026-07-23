import { expect, test } from "@playwright/test";

test("Node browser search focuses and reveals a canvas Node", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.type("Hello search target");
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("map-canvas").getByText("Hello search target"),
  ).toBeVisible();

  await canvas.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Other");
  await page.keyboard.press("Enter");

  const browser = page.getByTestId("map-node-browser");
  await expect(browser).toBeVisible();
  await browser.getByLabel("Search nodes").fill("Hello");
  await expect(browser.getByText("Hello search target")).toBeVisible();
  await expect(browser.getByText("No matching nodes")).toHaveCount(0);

  await browser.getByLabel("Search nodes").press("Enter");
  await expect(canvas).toHaveAttribute("aria-activedescendant", /node-/);

  await browser.getByLabel("Search nodes").fill("zzzz-none");
  await expect(browser.getByText("No matching nodes")).toBeVisible();
  await browser.getByLabel("Search nodes").press("Escape");
  await expect(browser.getByLabel("Search nodes")).toHaveValue("");
  await expect(browser.getByText("No matching nodes")).toHaveCount(0);
});

test("Escape leaves the Map canvas for the Node browser", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Search nodes")).toBeFocused();
});
