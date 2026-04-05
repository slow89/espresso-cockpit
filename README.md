# Espresso Cockpit

Espresso Cockpit is a tablet-first skin for the Decent DE1, built on top of Streamline Gateway. It is designed for compact machine-side operation: live telemetry, recipe control, workflow management, and setup surfaces that work on a small mounted display.

For gateway runtime, API, deployment, and browser behavior, use [tadelv/reaprime](https://github.com/tadelv/reaprime) as the source of truth.

## Highlights

- Live machine state over WebSocket
- Typed REST client for workflows, devices, settings, and shot history
- Portrait-tablet layout tuned for dense control surfaces
- GitHub Release packaging for skin distribution
- One-command tablet deployment for local hardware installs

## Screenshots

<p align="center">
  <img src="./docs/screenshots/dashboard-landscape.png" alt="Dashboard in before running" width="49%" />
  <img src="./docs/screenshots/dashboard-telemetry.png" alt="Dashboard while running" width="49%" />
</p>

<p align="center">
  <img src="./docs/screenshots/workflows-landscape.png" alt="Workflow editor in landscape mode" width="49%" />
  <img src="./docs/screenshots/settings-landscape.png" alt="Settings in landscape mode" width="49%" />
</p>

## Tech Stack

- Vite
- React 19
- TanStack Router
- TanStack Query
- Zustand
- `@visx/visx`
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 22 or newer
- `pnpm`
- A running Streamline Gateway instance

### Install

```bash
pnpm install
```

### Run the app

```bash
pnpm dev
```

By default, the app targets `http://localhost:8080`, which matches the default Streamline Gateway REST and WebSocket origin used during local development.

## Development Workflow

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm test:browser:smoke
pnpm check
```

- `pnpm lint` runs `oxlint`.
- `pnpm format:check` verifies formatting with `oxfmt`.
- `pnpm format` rewrites files with `oxfmt`.
- `pnpm test` runs the Vitest unit and component suite.
- `pnpm test:browser:smoke` runs the Playwright smoke path against the repo-local fake gateway.
- `pnpm check` is the preferred full validation command. It runs lint, format checks, tests, the production build, and browser smoke coverage.

For agent-oriented browser runs and targeted reruns, see [docs/agent-testing.md](./docs/agent-testing.md).

## Tablet Deployment

Deploy the current build directly to a tablet-connected gateway with:

```bash
pnpm deploy:tablet
```

That workflow:

1. builds the app
2. packages `dist/` into a skin archive
3. serves the archive from a temporary local HTTP server
4. asks the gateway to install the archive
5. sets the deployed skin as the default

The deploy script reads `.env` from the repo root.

For local tablet deploys, the script stamps `dist/manifest.json` with a unique development version based on the current time and git sha before packaging. This avoids the gateway/tablet reusing an older install under the same skin version.

Required:

```bash
TABLET_GATEWAY_ORIGIN=http://192.168.68.69:8080
```

Optional:

```bash
SKIN_DEPLOY_HOST=192.168.68.51
SKIN_DEPLOY_PORT=9000
```

## Release Packaging

Production skins are distributed as GitHub Release assets. The workflow in [`.github/workflows/release.yml`](./.github/workflows/release.yml):

- installs dependencies with `pnpm`
- builds the app
- stamps `dist/manifest.json` with the release version and repository URL
- creates a zip archive of the built skin
- publishes that archive to the tagged GitHub Release

Typical release flow:

```bash
git tag v0.1.3
git push origin v0.1.3
```

Once published, the release asset can be installed through Streamline Gateway's GitHub Release skin endpoint using the repository's `owner/repo`.

## Local Tooling

The repo includes [`.mcp.json`](./.mcp.json) for Playwright MCP, which makes it easier to exercise the UI from the local Codex workspace when a dev server is running.
