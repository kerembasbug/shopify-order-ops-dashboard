import { expect, test } from "@playwright/test";

test("dashboard renders overview cards and the orders table", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("secret-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("http://127.0.0.1:3000/");
  const overviewRegion = page.getByRole("region", { name: "Overview" });

  await expect(overviewRegion).toBeVisible({ timeout: 15_000 });
  await expect(
    overviewRegion.getByText("Total Revenue", { exact: true }),
  ).toBeVisible();
  await expect(
    overviewRegion.getByText("Orders", { exact: true }),
  ).toBeVisible();
  await expect(
    overviewRegion.getByText("Average Order Value", { exact: true }),
  ).toBeVisible();
  await expect(
    overviewRegion.getByText("Chargeback Watch", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Live order data could not be loaded. Showing an empty dashboard shell.",
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Source" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Flags" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Analytics" })).toBeVisible();
});
