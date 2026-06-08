import { expect, test } from "@playwright/test";

test("renders the static transfer surface on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop visual smoke runs in the desktop project.");

  await page.goto(`/?room=phase2-desktop-${Date.now()}`);

  await expect(page.getByLabel("Oppassum home")).toBeVisible();
  await expect(page.getByText("Upload Files")).toBeVisible();
  await expect(page.getByText("Upload Folder")).toBeVisible();
  await expect(page.getByText(/No Devices Connected Yet|Connecting to nearby devices/)).toBeVisible();
  await expect(page.getByLabel("Incoming transfer preview")).toBeHidden();
  await expect(page).toHaveScreenshot("phase-2-desktop.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.03
  });
});

test("keeps the static transfer surface usable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile visual smoke runs in the mobile project.");

  await page.goto(`/?room=phase2-mobile-${Date.now()}`);

  await expect(page.getByLabel("Oppassum home")).toBeVisible();
  await expect(page.getByText("Upload Files")).toBeVisible();
  await expect(page.getByText("Upload Folder")).toBeVisible();
  await expect(page.getByText(/No Devices Connected Yet|Connecting to nearby devices/)).toBeVisible();
  await expect(page).toHaveScreenshot("phase-2-mobile.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.03
  });
});
