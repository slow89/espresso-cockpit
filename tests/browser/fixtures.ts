import fs from "node:fs/promises";

import { expect, test as base, type Locator, type Page } from "@playwright/test";

import type { WorkflowRecord } from "../../src/rest/types";
import { defaultGatewayScenarioId, type GatewayScenarioId } from "../gateway/scenarios";

const fakeGatewayOrigin = process.env.PLAYWRIGHT_REAL_GATEWAY_URL?.trim()
  ? null
  : "http://127.0.0.1:18080";

interface BrowserSignalRecord {
  message: string;
  source: string;
  type: string;
}

interface NetworkSignalRecord {
  failure?: string;
  method: string;
  status?: number;
  url: string;
}

interface AllowedNetworkFailure {
  failure?: string;
  method?: string;
  path: string;
}

interface BrowserSignals {
  consoleErrors: BrowserSignalRecord[];
  networkErrors: NetworkSignalRecord[];
}

interface AppHarness {
  advanceStep: () => Promise<void>;
  gotoScenario: (options?: {
    path?: string;
    route?: string;
    scenarioId?: GatewayScenarioId;
  }) => Promise<void>;
  loadScenario: (scenarioId: GatewayScenarioId) => Promise<void>;
  markMetadata: (metadata: { route: string; scenarioId: GatewayScenarioId }) => void;
  readWorkflow: () => Promise<WorkflowRecord>;
}

export const test = base.extend<{
  app: AppHarness;
  browserSignals: BrowserSignals;
}>({
  app: async ({ page, request }, use, testInfo) => {
    const harness: AppHarness = {
      advanceStep: async () => {
        await request.post(`${fakeGatewayOrigin}/__control/advance-step`);
      },
      gotoScenario: async ({ path, route, scenarioId = defaultGatewayScenarioId } = {}) => {
        const targetRoute = route ?? path ?? "/";
        await harness.loadScenario(scenarioId);
        harness.markMetadata({
          route: targetRoute,
          scenarioId,
        });
        await page.goto(targetRoute);
      },
      loadScenario: async (scenarioId) => {
        if (!fakeGatewayOrigin) {
          return;
        }

        await request.post(`${fakeGatewayOrigin}/__control/load-scenario`, {
          data: {
            scenarioId,
          },
        });
      },
      markMetadata: ({ route, scenarioId }) => {
        testInfo.annotations.push({
          description: route,
          type: "route",
        });
        testInfo.annotations.push({
          description: scenarioId,
          type: "scenario",
        });
      },
      readWorkflow: async () => {
        const response = await request.get(`${fakeGatewayOrigin}/api/v1/workflow`);

        return (await response.json()) as WorkflowRecord;
      },
    };

    await use(harness);
  },
  browserSignals: async ({ page }, use, testInfo) => {
    const browserSignals: BrowserSignals = {
      consoleErrors: [],
      networkErrors: [],
    };

    page.on("console", (message) => {
      if (message.type() !== "error") {
        return;
      }

      browserSignals.consoleErrors.push({
        message: message.text(),
        source: message.location().url ?? "console",
        type: message.type(),
      });
    });

    page.on("pageerror", (error) => {
      browserSignals.consoleErrors.push({
        message: error.message,
        source: "pageerror",
        type: "pageerror",
      });
    });

    page.on("requestfailed", (request) => {
      const url = request.url();

      if (shouldIgnoreNetworkUrl(url)) {
        return;
      }

      browserSignals.networkErrors.push({
        failure: request.failure()?.errorText,
        method: request.method(),
        url,
      });
    });

    page.on("response", (response) => {
      const url = response.url();

      if (response.status() < 400 || shouldIgnoreNetworkUrl(url)) {
        return;
      }

      browserSignals.networkErrors.push({
        method: response.request().method(),
        status: response.status(),
        url,
      });
    });

    await use(browserSignals);

    const consolePath = testInfo.outputPath("console-errors.json");
    await fs.writeFile(consolePath, JSON.stringify(browserSignals.consoleErrors, null, 2));
    await testInfo.attach("console-errors", {
      contentType: "application/json",
      path: consolePath,
    });

    const networkPath = testInfo.outputPath("network-errors.json");
    await fs.writeFile(networkPath, JSON.stringify(browserSignals.networkErrors, null, 2));
    await testInfo.attach("network-errors", {
      contentType: "application/json",
      path: networkPath,
    });

    try {
      const screenshotPath = testInfo.outputPath("final.png");
      await page.screenshot({
        fullPage: true,
        path: screenshotPath,
      });
      await testInfo.attach("final-screenshot", {
        contentType: "image/png",
        path: screenshotPath,
      });
    } catch {
      // Ignore cases where the page is already closed after a fatal failure.
    }
  },
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await use(page);
  },
});

export { expect };

export async function assertBottomNavReachable(page: Page) {
  const nav = page.locator("nav").last();
  await expect(nav).toBeVisible();

  for (const name of ["Brew", "Profiles", "Shots", "Setup"] as const) {
    const link = nav.getByRole("link", {
      exact: true,
      name,
    });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();

    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
}

export async function assertNoCriticalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  expect(overflow.body).toBeLessThanOrEqual(2);
  expect(overflow.root).toBeLessThanOrEqual(2);
}

/** Checks the 7" tablet rules inside `root`: text at 0.66rem or more, tap targets at 36px or more. */
export async function assertTabletSizing(root: Locator) {
  const problems = await root.evaluate((rootElement) => {
    const remPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const minFontPx = 0.66 * remPx;
    const minTargetPx = 36;
    const found: string[] = [];
    const isShown = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return bounds.width > 1 && bounds.height > 1 && style.visibility !== "hidden";
    };
    const describe = (element: Element) =>
      `<${element.tagName.toLowerCase()}> "${(element.textContent ?? "").trim().slice(0, 30)}"`;

    for (const element of [rootElement, ...rootElement.querySelectorAll("*")]) {
      const hasOwnText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );

      if (!hasOwnText || !isShown(element)) {
        continue;
      }

      // SVG text scales with its viewBox, so its rendered size can differ from `font-size`.
      const svg = element.closest("svg");
      const scale =
        svg && svg.viewBox.baseVal.height > 0
          ? svg.getBoundingClientRect().height / svg.viewBox.baseVal.height
          : 1;
      const fontPx = Number.parseFloat(getComputedStyle(element).fontSize) * scale;

      if (fontPx < minFontPx - 0.01) {
        found.push(`${describe(element)} text is ${fontPx.toFixed(2)}px, under ${minFontPx}px`);
      }
    }

    for (const element of rootElement.querySelectorAll("button, a, input, select, textarea")) {
      const bounds = element.getBoundingClientRect();

      if (isShown(element) && (bounds.width < minTargetPx || bounds.height < minTargetPx)) {
        found.push(
          `${describe(element)} target is ${Math.round(bounds.width)}x${Math.round(bounds.height)}`,
        );
      }
    }

    return found;
  });

  expect(problems).toEqual([]);
}

export function assertNoAppErrors(
  browserSignals: BrowserSignals,
  options?: {
    allowedMessages?: string[];
    allowedConsoleSources?: string[];
    allowedNetworkFailures?: AllowedNetworkFailure[];
    allowedNetworkPaths?: string[];
    allowedStatusPaths?: string[];
  },
) {
  const allowedMessages = options?.allowedMessages ?? [];
  const allowedConsoleSources = options?.allowedConsoleSources ?? [];
  const allowedNetworkFailures = options?.allowedNetworkFailures ?? [];
  const allowedNetworkPaths = options?.allowedNetworkPaths ?? [];
  const allowedStatusPaths = options?.allowedStatusPaths ?? [];
  const unexpectedConsoleErrors = browserSignals.consoleErrors.filter(
    (entry) =>
      !allowedMessages.some((message) => entry.message.includes(message)) &&
      !allowedConsoleSources.some((source) => entry.source.includes(source)),
  );
  const unexpectedNetworkErrors = browserSignals.networkErrors.filter((entry) => {
    const failure = entry.failure;

    if (allowedNetworkPaths.some((allowedPath) => entry.url.includes(allowedPath))) {
      return false;
    }

    if (
      failure &&
      allowedNetworkFailures.some(
        (allowedFailure) =>
          entry.url.includes(allowedFailure.path) &&
          (allowedFailure.method == null || entry.method === allowedFailure.method) &&
          (allowedFailure.failure == null || failure.includes(allowedFailure.failure)),
      )
    ) {
      return false;
    }

    if (entry.status && allowedStatusPaths.some((allowedPath) => entry.url.includes(allowedPath))) {
      return false;
    }

    return true;
  });

  expect(unexpectedConsoleErrors).toEqual([]);
  expect(unexpectedNetworkErrors).toEqual([]);
}

export async function openAdvancedBridgePanel(page: Page) {
  const summary = page.locator("summary").filter({
    hasText: "Advanced Bridge",
  });
  await summary.click();
}

function shouldIgnoreNetworkUrl(url: string) {
  return url.includes("/__control/");
}
