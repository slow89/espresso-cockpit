import {
  assertBottomNavReachable,
  assertNoAppErrors,
  assertNoCriticalOverflow,
  expect,
  test,
} from "./fixtures";

test.describe("workflows", () => {
  function isTabletProject(projectName: string) {
    return (
      projectName === "tablet-xs-portrait" ||
      projectName === "tablet-xs-landscape" ||
      projectName === "tablet-sm-portrait" ||
      projectName === "tablet-sm-landscape"
    );
  }

  test("@smoke imports a profile and applies a different saved workflow", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/workflows",
      scenarioId: "workflows-default",
    });

    await expect(page.getByTestId("workflow-active-ticker")).toContainText("House");
    await page.getByLabel("Share code").fill("AB12");
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByText("Imported Imported AB12.")).toBeVisible();
    const turboProfileCard = page.getByRole("button", {
      name: /Turbo Decent \/ espresso 3f Fast and bright\./,
    });
    await turboProfileCard.focus();
    await turboProfileCard.press("Enter");
    await expect(page.getByTestId("workflow-active-ticker")).toContainText("Turbo");
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);

    if (isTabletProject(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("workflows-main.png");
    }
  });

  test("opens the frame preview overlay and edits shot setup controls", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/workflows",
      scenarioId: "workflows-default",
    });

    await page.getByRole("button", { name: "4f" }).click();
    const framePreviewDialog = page.getByRole("dialog");
    await expect(framePreviewDialog).toBeVisible();
    await expect(framePreviewDialog.getByText(/F1\/\d+/)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Increase Dose" }).click();
    await expect(page.getByTestId("workflow-active-ticker").getByText("19g")).toBeVisible();
    await page.getByRole("button", { name: "Increase Yield" }).click();
    await expect(page.getByTestId("workflow-active-ticker").getByText("37g")).toBeVisible();
    assertNoAppErrors(browserSignals);
  });

  test("shows setup guidance when visualizer uploads are disabled", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/workflows",
      scenarioId: "workflows-visualizer-disabled",
    });

    await expect(page.getByText("Enable Visualizer in Setup.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Import" })).toBeDisabled();
    assertNoAppErrors(browserSignals);
  });
});
