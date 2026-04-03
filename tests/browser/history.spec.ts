import {
  assertBottomNavReachable,
  assertNoAppErrors,
  assertNoCriticalOverflow,
  expect,
  test,
} from "./fixtures";

test.describe("history", () => {
  function isTabletProject(projectName: string) {
    return (
      projectName === "tablet-xs-portrait" ||
      projectName === "tablet-xs-landscape" ||
      projectName === "tablet-sm-portrait" ||
      projectName === "tablet-sm-landscape"
    );
  }

  test("@smoke renders the latest shot detail and supports refresh", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/history",
      scenarioId: "history-default",
    });

    await expect(page.getByLabel("espresso telemetry monitor")).toBeVisible();
    await page.getByRole("button", { name: "Refresh shot history" }).click();
    await expect(page.getByText("Shot archive")).toBeVisible();
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);

    if (isTabletProject(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("history-detail.png");
    }
  });

  test("recovers when the requested shot id is no longer in history", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/history?shotId=missing-shot",
      scenarioId: "history-selected-missing",
    });

    await expect(page.getByText("Shot not found")).toBeVisible();
    await page.getByRole("button", { name: "Show latest" }).click();
    await expect(page.getByLabel("espresso telemetry monitor")).toBeVisible();
    assertNoAppErrors(browserSignals);
  });

  test("surfaces shot-detail API failures without hiding the rest of the route", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/history?shotId=shot-2",
      scenarioId: "history-missing-shot-detail",
    });

    await expect(page.getByText("Unable to load shot")).toBeVisible();
    assertNoAppErrors(browserSignals, {
      allowedConsoleSources: ["/api/v1/shots/shot-2"],
      allowedStatusPaths: ["/api/v1/shots/shot-2"],
    });
  });

  test("shows the empty-state message when no shots have been synced", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/history",
      scenarioId: "history-empty",
    });

    await expect(page.getByText("No shots synced yet.")).toBeVisible();
    assertNoAppErrors(browserSignals);
  });
});
