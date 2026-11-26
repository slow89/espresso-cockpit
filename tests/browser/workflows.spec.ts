import type { Page } from "@playwright/test";

import {
  assertBottomNavReachable,
  assertNoAppErrors,
  assertNoCriticalOverflow,
  assertTabletSizing,
  expect,
  test,
} from "./fixtures";

const screenshotProjects = new Set([
  "tablet-7-landscape",
  "tablet-sm-portrait",
  "tablet-sm-landscape",
]);

function libraryRow(page: Page, title: string) {
  return page.getByTestId("library-row").filter({
    has: page.getByText(title, { exact: true }),
  });
}

function detail(page: Page) {
  return page.getByTestId("library-detail");
}

function strip(page: Page) {
  return page.getByTestId("loaded-profile-strip");
}

function button(page: Page, name: string) {
  return page.getByRole("button", { exact: true, name });
}

/** The rows as the operator reads them, in order: "↳ Title" when nested, without badges. */
async function listedRows(page: Page) {
  const rows = await page.getByTestId("library-row").allInnerTexts();

  return rows.map((row) =>
    row
      .replace(/\b(yours|loaded)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

test.describe("profile library", () => {
  test("@smoke selects a row without loading it, and Use loads only the profile", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-default" });

    await expect(strip(page)).toContainText("House");
    await expect(button(page, "Library")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "House" })).toBeVisible();
    await expect(button(page, "Loaded")).toBeDisabled();

    await libraryRow(page, "Turbo").click();

    await expect(page.getByRole("heading", { name: "Turbo" })).toBeVisible();
    await expect(detail(page)).toContainText("Fast and bright.");
    await expect(detail(page).getByLabel("workflow frame monitor")).toBeVisible();
    await expect(strip(page)).toContainText("House");
    expect((await app.readWorkflow()).profile?.title).toBe("House");

    await button(page, "Use").click();

    await expect(strip(page)).toContainText("Turbo");
    await expect(button(page, "Loaded")).toBeDisabled();

    const workflow = await app.readWorkflow();

    expect(workflow.profile?.title).toBe("Turbo");
    expect(workflow.profile?.steps).toHaveLength(3);
    expect(workflow.name).toBe("Morning");
    expect(workflow.context).toMatchObject({
      coffeeName: "Red Brick",
      grinderModel: "Niche Zero",
      grinderSetting: "5.2",
      targetDoseWeight: 18,
      targetYield: 36,
    });
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);
  });

  test("@smoke imports a share code from a dialog in the list header", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-default" });

    await button(page, "Import").click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toContainText("Enter 4-digit share code.");
    await assertTabletSizing(dialog);
    await expect(dialog.getByRole("button", { name: "Import" })).toBeDisabled();
    await dialog.getByLabel("Share code").fill("AB12");
    await dialog.getByRole("button", { name: "Import" }).click();
    await expect(dialog).toContainText("Imported Imported AB12.");
    await dialog.getByRole("button", { name: "Close" }).click();

    await expect(dialog).toBeHidden();
    await expect(libraryRow(page, "Imported AB12")).toBeVisible();
    expect((await app.readWorkflow()).profile?.title).toBe("House");
    assertNoAppErrors(browserSignals);
  });

  test("shows setup guidance in the import dialog when Visualizer is disabled", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-visualizer-disabled" });

    await button(page, "Import").click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toContainText("Enable Visualizer in Setup.");
    await dialog.getByLabel("Share code").fill("AB12");
    await expect(dialog.getByRole("button", { name: "Import" })).toBeDisabled();
    assertNoAppErrors(browserSignals);
  });

  test("@smoke lists one entry per profile, with Forks nested and nothing retired", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    await expect(libraryRow(page, "House")).toBeVisible();

    const rows = await listedRows(page);

    expect(rows.slice(0, 6)).toEqual([
      "Blooming",
      "House",
      "↳ House decaf",
      "Long decline with a title much wider than the list column can show",
      "Manual lever",
      "Orphan fork",
    ]);
    expect(rows.slice(6, 8)).toEqual(["Descale flush", "Flow profile 01"]);
    expect(rows.slice(-5)).toEqual([
      "Gentle and sweet",
      "Kalita",
      "Londonium",
      "↳ Londonium slow ramp",
      "Zeta",
    ]);

    for (const title of ["Old experiment", "Gentle retired copy", "Rao left the manifest"]) {
      await expect(libraryRow(page, title)).toHaveCount(0);
    }

    await expect(libraryRow(page, "Hid by the operator")).toHaveCount(0);
    await expect(libraryRow(page, "House")).toHaveAttribute("aria-current", "true");
    await expect(libraryRow(page, "House").getByText("Loaded")).toBeAttached();
    await expect(libraryRow(page, "House decaf").getByText("Loaded")).toHaveCount(0);

    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    await assertTabletSizing(page.getByTestId("profile-library"));
    await assertTabletSizing(strip(page));
    assertNoAppErrors(browserSignals);

    if (screenshotProjects.has(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("library-main.png");
    }
  });

  test("filters by chip, dropping a Fork to the top level when its parent is hidden", async ({
    app,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    await button(page, "Yours").click();
    expect(await listedRows(page)).toEqual([
      "Blooming",
      "House",
      "↳ House decaf",
      "Londonium slow ramp",
      "Long decline with a title much wider than the list column can show",
      "Manual lever",
      "Orphan fork",
    ]);

    await button(page, "Pour-over").click();
    expect(await listedRows(page)).toEqual(["Kalita"]);

    await button(page, "Other").click();
    expect(await listedRows(page)).toEqual(["Manual lever", "Descale flush"]);

    await button(page, "Espresso").click();
    await expect(libraryRow(page, "Manual lever")).toHaveCount(0);
    await expect(libraryRow(page, "Londonium")).toBeVisible();

    await button(page, "All").click();
    await expect(libraryRow(page, "Manual lever")).toBeVisible();
  });

  test("describes each profile's origin in the detail pane", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    await libraryRow(page, "House decaf").click();
    await expect(detail(page)).toContainText("Decent · Espresso · 3 Steps · Copy of House");
    await expect(detail(page).getByText("Yours", { exact: true })).toBeVisible();

    await libraryRow(page, "Blooming").click();
    await expect(detail(page)).toContainText("3 Steps · Revised from Bundled");

    await libraryRow(page, "Orphan fork").click();
    await expect(detail(page)).toContainText("3 Steps · Copy of Old experiment");

    await libraryRow(page, "Gentle and sweet").click();
    await expect(detail(page)).toContainText("Decent · Espresso · 3 Steps");
    await expect(detail(page)).not.toContainText("Copy of");
    await expect(detail(page).getByText("Bundled", { exact: true })).toBeVisible();

    await libraryRow(page, "House").click();
    await expect(detail(page).locator("span", { hasText: /^Loaded$/ })).toBeVisible();
  });

  test("truncates a long title before its badges", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    const row = libraryRow(
      page,
      "Long decline with a title much wider than the list column can show",
    );

    await row.click();
    await expect(row.getByText("Yours", { exact: true })).toBeInViewport({ ratio: 1 });
    await expect(detail(page).getByText("Yours", { exact: true })).toBeInViewport({ ratio: 1 });
    await assertNoCriticalOverflow(page);
  });

  test("keeps the selection, chip, and segment across a trip to Brew", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    await button(page, "Espresso").click();
    await libraryRow(page, "Londonium").click();

    await page.locator("nav").last().getByRole("link", { exact: true, name: "Brew" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.locator("nav").last().getByRole("link", { exact: true, name: "Profiles" }).click();

    await expect(button(page, "Espresso")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Londonium" })).toBeVisible();
    await expect(libraryRow(page, "Londonium")).toHaveAttribute("aria-current", "true");
    await expect(page).toHaveURL(/\/workflows$/);

    await button(page, "Shot setup").click();
    await page.locator("nav").last().getByRole("link", { exact: true, name: "Brew" }).click();
    await page.locator("nav").last().getByRole("link", { exact: true, name: "Profiles" }).click();

    await expect(button(page, "Shot setup")).toHaveAttribute("aria-pressed", "true");
    await expect(strip(page)).toContainText("House");
  });

  test("selects the loaded profile and scrolls it into view when the Library opens", async ({
    app,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-library" });

    await libraryRow(page, "Zeta").click();
    await button(page, "Use").click();
    await expect(strip(page)).toContainText("Zeta");

    await page.reload();

    await expect(libraryRow(page, "Zeta")).toHaveAttribute("aria-current", "true");
    await expect(libraryRow(page, "Zeta")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Zeta" })).toBeVisible();
  });

  test("asks before a load replaces a loaded profile that differs from saved", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-differs" });

    await expect(strip(page)).toContainText("Differs from saved");
    await expect(detail(page).getByText("Differs from saved", { exact: true })).toBeVisible();
    await expect(button(page, "Loaded")).toBeDisabled();

    await libraryRow(page, "Turbo").click();
    await expect(detail(page).getByText("Differs from saved", { exact: true })).toHaveCount(0);
    await button(page, "Use").click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toContainText(
      "House has unsaved changes. Loading another profile discards them.",
    );
    await assertTabletSizing(dialog);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    expect((await app.readWorkflow()).profile?.title).toBe("House");
    await expect(strip(page)).toContainText("House");

    await button(page, "Use").click();
    await dialog.getByRole("button", { name: "Discard and load" }).click();

    await expect(dialog).toBeHidden();
    await expect(strip(page)).toContainText("Turbo");
    await expect(strip(page)).not.toContainText("Differs from saved");
    expect((await app.readWorkflow()).profile?.title).toBe("Turbo");
    assertNoAppErrors(browserSignals);
  });

  test("won't let a confirmed load through once the machine starts", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-differs" });

    await libraryRow(page, "Turbo").click();
    await button(page, "Use").click();

    const dialog = page.getByRole("dialog");

    await expect(dialog.getByRole("button", { name: "Discard and load" })).toBeEnabled();

    await app.advanceStep();

    await expect(dialog.getByRole("button", { name: "Discard and load" })).toBeDisabled();
    await expect(dialog).toContainText("Available when the shot ends");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    expect((await app.readWorkflow()).profile?.title).toBe("House");
  });

  test("reads Not saved when no visible profile has the loaded title", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-not-saved" });

    await expect(strip(page)).toContainText("Scratch trial");
    await expect(strip(page)).toContainText("Not saved");
    await expect(page.getByTestId("library-row").getByText("Loaded")).toHaveCount(0);

    await button(page, "Use").click();

    await expect(page.getByRole("dialog")).toContainText(
      "Scratch trial has unsaved changes. Loading another profile discards them.",
    );
  });

  test("disables Use while the machine runs, and keeps browsing available", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-busy" });

    await expect(button(page, "Loaded")).toBeDisabled();
    await expect(detail(page)).not.toContainText("Available when the shot ends");

    await libraryRow(page, "Turbo").click();

    await expect(page.getByRole("heading", { name: "Turbo" })).toBeVisible();
    await expect(button(page, "Use")).toBeDisabled();
    await expect(detail(page)).toContainText("Available when the shot ends");
    expect((await app.readWorkflow()).profile?.title).toBe("House");
    assertNoAppErrors(browserSignals);
  });

  test("stays disabled when a connected machine's state can't be read", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-machine-unreadable" });

    await libraryRow(page, "Turbo").click();

    // Longer than the query's one retry, whose in-flight state would pass this for the wrong reason.
    await page.waitForTimeout(2_500);

    await expect(button(page, "Use")).toBeDisabled();
    await expect(detail(page)).toContainText("Available when the shot ends");
    expect((await app.readWorkflow()).profile?.title).toBe("House");
  });

  test("allows Use with no machine connected", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-no-machine" });

    await libraryRow(page, "Turbo").click();
    await button(page, "Use").click();

    await expect(strip(page)).toContainText("Turbo");
    expect((await app.readWorkflow()).profile?.title).toBe("Turbo");
  });

  test("won't load over a Workflow it couldn't read", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-unread" });

    await libraryRow(page, "Turbo").click();

    await expect(strip(page)).toContainText("Waiting for the Bridge");
    await expect(button(page, "Use")).toBeDisabled();
    await expect(detail(page)).toContainText("Waiting for the Bridge to report what's loaded");
  });

  test("keeps today's setup controls in the Shot setup segment", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-default" });

    await button(page, "Shot setup").click();
    await expect(page.getByRole("heading", { name: "House" })).toHaveCount(0);
    await expect(strip(page)).toContainText("House");

    await page.getByRole("button", { name: "Increase Dose" }).click();
    await expect(page.getByText("19g")).toBeVisible();
    await page.getByRole("button", { name: "Increase Yield" }).click();
    await expect(page.getByText("37g")).toBeVisible();

    expect((await app.readWorkflow()).context).toMatchObject({
      targetDoseWeight: 19,
      targetYield: 37,
    });
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    await assertTabletSizing(page.getByTestId("shot-setup"));
    assertNoAppErrors(browserSignals);

    if (screenshotProjects.has(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("shot-setup.png");
    }
  });

  test("retires the Choose Profile panel and the frame preview overlay", async ({ app, page }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-default" });

    await expect(strip(page)).toBeVisible();
    await expect(page.getByText("Choose Profile")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^\d+f$/i })).toHaveCount(0);
  });

  test("opens the chart controls over the whole screen, within the sizing rules", async ({
    app,
    page,
  }) => {
    await app.gotoScenario({ route: "/workflows", scenarioId: "workflows-default" });

    await detail(page).getByRole("button", { name: "Open chart controls" }).click();

    const overlay = page.getByTestId("workflow-frame-config-overlay");

    await expect(overlay).toBeVisible();

    const box = await overlay.boundingBox();
    const viewport = page.viewportSize();

    expect(box?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.85);
    expect(box?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.85);
    await assertTabletSizing(overlay);
  });
});
