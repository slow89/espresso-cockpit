import { defineConfig } from "@playwright/test";

const appHost = "127.0.0.1";
const appPort = 4173;
const fakeGatewayPort = 18080;
const realGatewayUrl = process.env.PLAYWRIGHT_REAL_GATEWAY_URL?.trim() || null;
const isCi = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: isCi ? 0.025 : undefined,
      pathTemplate:
        "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
      scale: "device",
    },
  },
  fullyParallel: false,
  outputDir: "output/playwright/results",
  reporter: [
    ["line"],
    ["./tests/browser/agent-reporter.ts"],
  ],
  retries: isCi ? 1 : 0,
  testDir: "./tests/browser",
  timeout: 45_000,
  use: {
    baseURL: `http://${appHost}:${appPort}`,
    colorScheme: "dark",
    headless: true,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: realGatewayUrl
    ? [
        {
          command: `VITE_BRIDGE_URL=${realGatewayUrl} pnpm dev --host ${appHost} --port ${appPort}`,
          reuseExistingServer: !isCi,
          stderr: "pipe",
          stdout: "pipe",
          timeout: 60_000,
          url: `http://${appHost}:${appPort}`,
        },
      ]
    : [
        {
          command: `pnpm exec tsx tests/gateway/server.ts --host ${appHost} --port ${fakeGatewayPort}`,
          reuseExistingServer: !isCi,
          stderr: "pipe",
          stdout: "pipe",
          timeout: 60_000,
          url: `http://${appHost}:${fakeGatewayPort}/__control/state`,
        },
        {
          command: `VITE_BRIDGE_URL=http://${appHost}:${fakeGatewayPort} pnpm dev --host ${appHost} --port ${appPort}`,
          reuseExistingServer: !isCi,
          stderr: "pipe",
          stdout: "pipe",
          timeout: 60_000,
          url: `http://${appHost}:${appPort}`,
        },
      ],
  workers: 1,
  projects: [
    {
      name: "tablet-sm-portrait",
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: {
          height: 1280,
          width: 800,
        },
      },
    },
    {
      name: "tablet-sm-landscape",
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: {
          height: 800,
          width: 1280,
        },
      },
    },
    {
      name: "laptop",
      use: {
        hasTouch: false,
        isMobile: false,
        viewport: {
          height: 912,
          width: 1366,
        },
      },
    },
    {
      name: "desktop-wide",
      use: {
        hasTouch: false,
        isMobile: false,
        viewport: {
          height: 1024,
          width: 1600,
        },
      },
    },
  ],
});
