import {
  assertBottomNavReachable,
  assertNoAppErrors,
  assertNoCriticalOverflow,
  expect,
  test,
} from "./fixtures";

test.describe("dashboard", () => {
  function usesTabletDashboardLayout(projectName: string) {
    return projectName === "tablet-sm-portrait" || projectName === "tablet-7-landscape";
  }

  function isTabletProject(projectName: string) {
    return usesTabletDashboardLayout(projectName) || projectName === "tablet-sm-landscape";
  }

  test("@smoke renders the idle tablet workspace without layout regressions", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-idle",
    });

    if (usesTabletDashboardLayout(testInfo.project.name)) {
      await expect(page.getByTestId("dashboard-tablet-prep-board")).toBeVisible();
    } else {
      await expect(page.getByTestId("dashboard-desktop-workspace")).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Sleep machine" })).toBeVisible();
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);

    if (isTabletProject(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("dashboard-idle.png");
    }
  });

  test("@smoke switches to the shot workspace when telemetry begins streaming", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-active-shot",
    });

    if (usesTabletDashboardLayout(testInfo.project.name)) {
      await expect(page.getByTestId("dashboard-tablet-prep-board")).toBeVisible();
    } else {
      await expect(page.getByTestId("dashboard-desktop-workspace")).toBeVisible();
    }
    await app.advanceStep();
    if (usesTabletDashboardLayout(testInfo.project.name)) {
      await expect(page.getByTestId("dashboard-tablet-shot-workspace")).toBeVisible();
      await expect(page.getByTestId("dashboard-shot-summary")).toBeVisible();
    } else {
      await expect(page.getByTestId("dashboard-desktop-workspace")).toBeVisible();
      await expect(
        page.getByTestId("dashboard-desktop-workspace").getByLabel("espresso telemetry monitor"),
      ).toBeVisible();
    }
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);

    if (isTabletProject(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("dashboard-shot-active.png");
    }
  });

  test("shows the sleep screen and wakes back into the main workspace", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-sleeping",
    });

    await expect(page.getByTestId("dashboard-sleep-screen")).toBeVisible();
    await page.getByRole("button", { name: "Turn on machine" }).click();
    await expect(page.getByRole("button", { name: "Sleep machine" })).toBeVisible();
    await assertBottomNavReachable(page);
    assertNoAppErrors(browserSignals, {
      allowedNetworkPaths: ["/api/v1/machine/state/idle"],
    });
  });

  test("surfaces unpaired-scale guidance on tablet", async ({ app, browserSignals, page }) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-no-scale",
    });

    await expect(page.getByText("No scale paired")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tare" })).toBeHidden();
    assertNoAppErrors(browserSignals);
  });

  test("shows the low-water overlay when the reservoir falls below the alert threshold", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-low-water",
    });

    await expect(page.getByLabel("Water tank low")).toBeVisible();
    await expect(page.getByText("Refill the tank!")).toBeVisible();
    assertNoAppErrors(browserSignals);
  });

  test("keeps the desktop rail mounted on wide screens", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-wide");

    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-idle",
    });

    await expect(page.getByTestId("dashboard-desktop-workspace")).toBeVisible();
    await expect(page.getByRole("button", { name: "Decrease Dose" })).toBeVisible();
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);
  });

  test("handles malformed machine stream payloads without a page crash", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/",
      scenarioId: "dashboard-malformed-machine-stream",
    });

    await app.advanceStep();
    await expect(page.getByRole("button", { name: "Sleep machine" })).toBeVisible();
    if (usesTabletDashboardLayout(testInfo.project.name)) {
      await expect(page.getByTestId("dashboard-tablet-prep-board")).toBeVisible();
    } else {
      await expect(page.getByTestId("dashboard-desktop-workspace")).toBeVisible();
    }
    assertNoAppErrors(browserSignals);
  });
});
