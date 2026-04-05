import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");
const zipName = "espresso-cockpit.zip";
const zipPath = path.join(rootDir, zipName);
const manifestPath = path.join(distDir, "manifest.json");

loadLocalEnvFile(path.join(rootDir, ".env"));

const tabletGatewayOrigin = getRequiredGatewayOrigin("TABLET_GATEWAY_ORIGIN");
const deployHost = process.env.SKIN_DEPLOY_HOST ?? getPreferredLanAddress();
const deployPort = Number(process.env.SKIN_DEPLOY_PORT ?? "9000");

async function main() {
  await access(distDir);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const stampedManifest = {
    ...manifest,
    version: await buildDeployVersion(manifest.version),
  };
  await writeFile(manifestPath, `${JSON.stringify(stampedManifest, null, 2)}\n`, "utf8");

  const skinId = manifest.id;
  const port = await findAvailablePort(deployPort);

  if (!skinId) {
    throw new Error(`Missing skin id in ${manifestPath}`);
  }

  console.log(`Packaging ${skinId}@${stampedManifest.version} from dist/...`);
  await execFileAsync("zip", ["-rFS", zipPath, "."], { cwd: distDir });

  const zipStats = await stat(zipPath);
  const server = createZipServer(zipPath, zipName);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", resolve);
  });

  const archiveUrl = `http://${deployHost}:${port}/${zipName}`;

  console.log(`Serving ${zipName} (${zipStats.size} bytes) from ${archiveUrl}`);

  try {
    await expectReachable(archiveUrl);
    const installResult = await postJson(`${tabletGatewayOrigin}/api/v1/webui/skins/install/url`, {
      url: archiveUrl,
    });
    const defaultResult = await putJson(`${tabletGatewayOrigin}/api/v1/webui/skins/default`, {
      skinId,
    });
    const skins = await getJson(`${tabletGatewayOrigin}/api/v1/webui/skins`);

    console.log(`Install response: ${JSON.stringify(installResult)}`);
    console.log(`Default response: ${JSON.stringify(defaultResult)}`);
    console.log(
      `Tablet skins: ${skins.map((skin) => `${skin.id}@${skin.version ?? "unknown"}`).join(", ")}`,
    );
    console.log(`Activated version: ${stampedManifest.version}`);
    console.log(`Open on tablet: http://localhost:3000/`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

async function buildDeployVersion(baseVersion) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", ".");
  const gitSha = await getGitShortSha();
  const suffix = ["dev", timestamp, gitSha].filter(Boolean).join(".");

  return `${baseVersion}-${suffix}`;
}

async function getGitShortSha() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: rootDir,
    });

    return stdout.trim();
  } catch {
    return null;
  }
}

function createZipServer(filePath, servedName) {
  return createServer(async (request, response) => {
    const pathname = request.url?.split("?")[0] ?? "/";

    if (pathname !== `/${servedName}`) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const file = await readFile(filePath);

      response.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Length": file.byteLength,
        "Cache-Control": "no-store",
      });
      response.end(file);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Unable to read zip");
    }
  });
}

async function expectReachable(url) {
  const response = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`Archive check failed for ${url}: ${response.status}`);
  }
}

async function getJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }

  return response.json();
}

async function postJson(url, body) {
  return sendJson("POST", url, body);
}

async function putJson(url, body) {
  return sendJson("PUT", url, body);
}

async function sendJson(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${text}`);
  }

  return data;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function loadLocalEnvFile(filePath) {
  try {
    process.loadEnvFile(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function getRequiredGatewayOrigin(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env or your shell environment.`);
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Invalid ${name} protocol: ${parsedUrl.protocol}`);
  }

  return parsedUrl.origin;
}

function getPreferredLanAddress() {
  const networks = networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(networks)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue;
      }

      candidates.push(entry.address);
    }
  }

  const preferred =
    candidates.find((address) => address.startsWith("192.168.")) ??
    candidates.find((address) => address.startsWith("10.")) ??
    candidates.find((address) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) ??
    candidates[0];

  if (!preferred) {
    throw new Error("Unable to determine a LAN IPv4 address. Set SKIN_DEPLOY_HOST explicitly.");
  }

  return preferred;
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const available = await new Promise((resolve) => {
      const probe = createServer();

      probe.once("error", () => resolve(false));
      probe.listen(port, "0.0.0.0", () => {
        probe.close(() => resolve(true));
      });
    });

    if (available) {
      return port;
    }
  }

  throw new Error(`Unable to find an open port starting at ${startPort}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
