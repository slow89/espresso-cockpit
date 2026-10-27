// Records the post-shot flow at the 7" tablet viewport (1024x600) against the
// fake gateway: idle prep board → live 30 s simulated shot → post-shot summary
// with the frozen chart → scrub → taste + Analyze (stubbed LLM) → Done.
import { mkdir, rename, rm } from "node:fs/promises";
import { chromium } from "@playwright/test";

const gateway = "http://127.0.0.1:18080";
const app = process.env.APP_URL ?? "http://127.0.0.1:4321";
const outDir = "output/post-shot-demo";
const videoDir = `${outDir}/raw-video`;
const llmOrigin = "https://llm.cockpit.demo";
const viewport = { height: 600, width: 1024 };

const analysis = {
  diagnosis:
    "The shot ran about 30 s to roughly 41 g — some 5 g past the 36 g target — with flow pinned near 2.4 ml/s at 8.8 bar the whole way. Paired with a sour, thin cup, the puck is offering too little resistance, so water is rushing through without extracting enough.",
  primary: {
    action: "Grind finer",
    detail: "2 steps",
    rationale: "Slower flow at the same pressure raises extraction and lands 36 g closer to 30 s.",
  },
  secondary: {
    action: "Stop at 36 g",
    rationale: "If it is still sour after the grind change, finish at target before touching temperature.",
  },
};

const corsHeaders = {
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gatewayPost = (path, data) =>
  fetch(`${gateway}${path}`, {
    body: JSON.stringify(data ?? {}),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

await rm(videoDir, { force: true, recursive: true });
await mkdir(videoDir, { recursive: true });
await gatewayPost("/__control/load-scenario", { scenarioId: "dashboard-idle" });

const browser = await chromium.launch();
const context = await browser.newContext({
  colorScheme: "dark",
  hasTouch: true,
  isMobile: true,
  recordVideo: { dir: videoDir, size: viewport },
  viewport,
});

await context.addInitScript(
  ({ llmOrigin }) => {
    localStorage.clear();
    localStorage.setItem(
      "espresso-cockpit-shot-analysis",
      JSON.stringify({
        state: {
          apiKey: "demo",
          baseUrl: `${llmOrigin}/v1`,
          model: "demo",
          provider: "openai-compatible",
          provisionStamp: "",
        },
        version: 0,
      }),
    );

    // Tap indicator so taps are visible in the recording.
    window.addEventListener("pointerdown", (event) => {
      const dot = document.createElement("div");
      dot.style.cssText = `position:fixed;left:${event.clientX - 22}px;top:${event.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.35);border:2px solid rgba(255,255,255,0.8);pointer-events:none;z-index:99999;transition:transform 450ms ease-out,opacity 450ms ease-out;`;
      document.body.appendChild(dot);
      requestAnimationFrame(() => {
        dot.style.transform = "scale(1.6)";
        dot.style.opacity = "0";
      });
      setTimeout(() => dot.remove(), 500);
    });
  },
  { llmOrigin },
);

const page = await context.newPage();

await page.route(`${llmOrigin}/**`, async (route) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ headers: corsHeaders, status: 204 });
    return;
  }

  await sleep(2400);
  await route.fulfill({
    body: JSON.stringify({
      choices: [
        {
          finish_reason: "stop",
          index: 0,
          message: { content: JSON.stringify(analysis), role: "assistant" },
        },
      ],
      created: Math.floor(Date.now() / 1000),
      id: "chatcmpl-demo",
      model: "demo",
      object: "chat.completion",
      usage: { completion_tokens: 140, prompt_tokens: 1800, total_tokens: 1940 },
    }),
    headers: { ...corsHeaders, "content-type": "application/json" },
    status: 200,
  });
});

await page.goto(app);
await page.getByTestId("dashboard-tablet-prep-board").waitFor();
await sleep(2500);

// Start the shot the way the machine would; the fake gateway streams a 30 s shot.
const shotStartedAt = new Date();
await fetch(`${gateway}/api/v1/machine/state/espresso`, { method: "PUT" });
await page.getByTestId("dashboard-tablet-shot-workspace").waitFor();
await sleep(15_000);
await page.screenshot({ path: `${outDir}/frame-live-shot.png` });

const summary = page.getByTestId("dashboard-tablet-post-shot-summary");
await summary.waitFor({ timeout: 30_000 });
await sleep(2500);
await page.screenshot({ path: `${outDir}/frame-post-shot.png` });

// The Bridge persists the shot a moment later; mirror that so "Saving" becomes "Shots".
await page.route("**/api/v1/shots/latest", async (route) => {
  const response = await route.fetch();
  const shot = await response.json();
  await route.fulfill({
    json: { ...shot, id: "demo-shot", timestamp: new Date(shotStartedAt.getTime() + 500).toISOString() },
    response,
  });
});

// Scrub the frozen chart with a finger.
const chart = summary.getByLabel("espresso telemetry monitor");
const box = await chart.boundingBox();
if (box) {
  const y = box.y + box.height * 0.55;
  const startX = box.x + 60;
  const endX = box.x + box.width - 70;
  await page.mouse.move(startX, y);
  for (let step = 0; step <= 40; step += 1) {
    await page.mouse.move(startX + ((endX - startX) * step) / 40, y);
    await sleep(55);
  }
  await sleep(500);
  const middleX = startX + (endX - startX) * 0.45;
  for (let step = 0; step <= 20; step += 1) {
    await page.mouse.move(endX + ((middleX - endX) * step) / 20, y);
    await sleep(45);
  }
  await sleep(900);
  await page.screenshot({ path: `${outDir}/frame-scrub.png` });
  await page.mouse.move(box.x + box.width / 2, box.y - 40);
}
await sleep(800);

for (const option of ["Too sour", "Weak", "Thin"]) {
  await summary.getByRole("button", { exact: true, name: option }).click();
  await sleep(650);
}
await sleep(400);
await summary.getByRole("button", { name: "Analyze" }).click();
await sleep(900);
await page.screenshot({ path: `${outDir}/frame-analyzing.png` });
await summary.getByText("Primary adjustment").waitFor();
await sleep(1200);

const rail = summary.locator("aside");
await rail.evaluate((element) => element.scrollTo({ behavior: "smooth", top: element.scrollHeight }));
await sleep(3200);
await page.screenshot({ path: `${outDir}/frame-analysis.png` });
await rail.evaluate((element) => element.scrollTo({ behavior: "smooth", top: 0 }));
await sleep(1500);

await summary.getByRole("button", { name: "Done" }).click();
await page.getByTestId("dashboard-tablet-prep-board").waitFor();
await sleep(1000);
await page.screenshot({ path: `${outDir}/frame-done.png` });
await sleep(1500);

const video = page.video();
await context.close();
await browser.close();

const target = `${outDir}/post-shot-chart-7in.webm`;
await rm(target, { force: true });
await rename(await video.path(), target);
await rm(videoDir, { force: true, recursive: true });
console.log(target);
