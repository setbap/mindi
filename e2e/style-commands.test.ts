import { expect, test } from "@playwright/test";

test("resize, color slot, and undo persist on the Open Map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await expect(page.getByTestId("style-commands")).toBeVisible();
  const styles = page.getByTestId("style-commands");
  await styles.getByRole("button", { name: "Resize" }).click();
  await page.getByLabel("Node width").fill("360");
  await page.getByRole("button", { name: "Apply" }).click();

  const root = page.locator("[data-testid^='node-']").first();
  await expect(root).toHaveCSS("width", "360px");

  await styles.getByRole("button", { name: "Color slot 4" }).click();
  await expect(root).toHaveCSS("background-color", "rgb(184, 187, 38)");

  await styles.getByRole("button", { name: "Undo" }).click();
  await expect(root).not.toHaveCSS("background-color", "rgb(184, 187, 38)");

  await styles.getByRole("button", { name: "Undo" }).click();
  await expect(root).toHaveCSS("width", "280px");
});
