import { expect, test } from "@playwright/test";

test("dashboard renders overview cards and the orders table", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("secret-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("http://127.0.0.1:3000/");
  await expect(page.getByRole("region", { name: "Overview" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Selected Sales")).toBeVisible();
  await expect(page.getByText("Previous Sales")).toBeVisible();
  await expect(page.getByText("Growth")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Sales Channel" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Landing Page" })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Referrer / Source" }),
  ).toBeVisible();
});
