import {
  assertBottomNavReachable,
  assertNoAppErrors,
  assertNoCriticalOverflow,
  expect,
  openAdvancedBridgePanel,
  test,
} from "./fixtures";

test.describe("settings", () => {
  function isTabletProject(projectName: string) {
    return (
      projectName === "tablet-xs-portrait" ||
      projectName === "tablet-xs-landscape" ||
      projectName === "tablet-sm-portrait" ||
      projectName === "tablet-sm-landscape"
    );
  }

  test("@smoke saves the gateway target and enables visualizer uploads", async ({
    app,
    browserSignals,
    page,
  }, testInfo) => {
    await app.gotoScenario({
      route: "/settings",
      scenarioId: "settings-default",
    });

    await openAdvancedBridgePanel(page);
    const gatewayInput = page.getByLabel("REST origin");
    await gatewayInput.fill("http://127.0.0.1:18080/");
    await page.getByRole("button", { name: "Save & reconnect" }).click();
    await expect(gatewayInput).toHaveValue("http://127.0.0.1:18080");

    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Verified")).toBeVisible();
    await page.getByRole("button", { name: "Enable uploads" }).click();
    await expect(page.getByText("Visualizer on")).toBeVisible();
    await assertBottomNavReachable(page);
    await assertNoCriticalOverflow(page);
    assertNoAppErrors(browserSignals);

    if (isTabletProject(testInfo.project.name)) {
      await expect(page).toHaveScreenshot("settings-main.png");
    }
  });

  test("updates display, pairing, and machine warning controls", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/settings",
      scenarioId: "settings-default",
    });

    await page.getByRole("button", { exact: true, name: "Connect machine" }).click();
    await expect(page.getByRole("button", { exact: true, name: "Disconnect machine" })).toHaveCount(2);

    await page.getByRole("button", { name: "45m" }).click();
    await expect(page.getByText("45 min").first()).toBeVisible();

    const brightnessSlider = page.getByLabel("Brightness level");
    const brightnessControl = brightnessSlider.locator("xpath=ancestor::section[1]");
    await brightnessSlider.focus();
    await brightnessSlider.press("Home");
    await expect(brightnessSlider).toHaveValue("0");
    await expect(brightnessControl).toContainText("Applied: 0%");

    await page.getByRole("button", { name: "Keep screen on" }).click();
    await expect(page.getByRole("button", { name: "Let screen sleep" })).toBeVisible();

    const waterAlertSlider = page.getByLabel("Water alert threshold");
    await waterAlertSlider.focus();
    await waterAlertSlider.press("End");
    await expect(waterAlertSlider).toHaveValue("30");

    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    assertNoAppErrors(browserSignals, {
      allowedNetworkFailures: [
        {
          failure: "net::ERR_ABORTED",
          method: "PUT",
          path: "/api/v1/devices/connect",
        },
      ],
    });
  });

  test("shows the empty device state when the bridge reports no tracked devices", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/settings",
      scenarioId: "settings-no-devices",
    });

    await expect(
      page.getByText("No tracked devices are currently reported by the bridge."),
    ).toBeVisible();
    assertNoAppErrors(browserSignals);
  });

  test("shows the device error state for bridge discovery failures", async ({
    app,
    browserSignals,
    page,
  }) => {
    await app.gotoScenario({
      route: "/settings",
      scenarioId: "settings-device-error",
    });

    await expect(page.getByText("Device state is unavailable right now.")).toBeVisible();
    assertNoAppErrors(browserSignals, {
      allowedConsoleSources: ["/api/v1/devices"],
      allowedStatusPaths: ["/api/v1/devices"],
    });
  });
});
