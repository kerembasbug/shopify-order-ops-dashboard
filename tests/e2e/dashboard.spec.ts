import { expect, test } from "@playwright/test";

test("dashboard renders overview cards and the orders table", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("secret-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Total Orders")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});
