

## Problem

The VPS deployment runs `npm ci --legacy-peer-deps` inside the Dockerfile. `npm ci` requires `package.json` and `package-lock.json` to be perfectly in sync, and **fails (exit 1)** otherwise. Recently added dependencies (`react-pdf@9.1.1`, `pdfjs-dist@4.4.168` — for the SIGDSTS PDF guide reader) were registered by Bun in `bun.lock`/`bun.lockb` but **never written into `package-lock.json`**, which is what the Docker build uses. Hence the build error:

```
process "/bin/sh -c npm ci --legacy-peer-deps" did not complete successfully: exit code: 1
```

I cannot run `git push`/SSH deploy from this environment (no git/SSH credentials, deploy is triggered by GitHub Actions on push to `main`). What I can do is **fix the root cause in the repo** so the next push (which Lovable performs automatically when files change) triggers a successful CI/CD build on your VPS.

## Plan

### 1. Regenerate `package-lock.json` in sync with `package.json`
- Run `npm install --legacy-peer-deps --package-lock-only` to rebuild `package-lock.json` including `react-pdf`, `pdfjs-dist` and their transitive deps.
- Verify the new lockfile contains both packages.

### 2. Make the Dockerfile resilient to future drift (defensive hardening)
- Update `Dockerfile` step `RUN npm ci --legacy-peer-deps` to fallback automatically if the lockfile is out-of-sync:
  ```
  RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps --no-audit --no-fund
  ```
- This prevents the entire deployment pipeline from breaking again the next time a dependency is added via Bun/Lovable while CI uses npm.

### 3. Local sanity check
- Run `npm ci --legacy-peer-deps` locally in the sandbox (the same command Docker runs) to confirm it now succeeds before the change is committed.
- Run `npm run build` to confirm the production bundle compiles end-to-end (catches any react-pdf/pdfjs build issues before they reach the VPS).

### 4. Commit & deploy
- Saving the updated `package-lock.json` and `Dockerfile` in Lovable automatically pushes to the connected GitHub repo's `main` branch.
- The existing GitHub Action `.github/workflows/deploy.yml` then SSHes into the VPS, runs `git pull`, rebuilds the Docker images (now successfully), and restarts the containers behind Traefik on `bot.bj`.
- I'll monitor by inspecting the build logs the action prints; if anything else fails I'll iterate.

## What I will NOT change
- No application code changes. The PDF reader, ticket flows and `/sigdsts` routes already work — this is purely a build/dependency-sync issue.
- No change to `bun.lock` (Lovable manages it).
- No change to the VPS, Traefik or `docker-compose.yml`.

## Technical details
- Root cause: `npm ci` is intentionally strict — it errors if `package.json` declares a package not pinned in `package-lock.json`. Bun and npm maintain separate lockfiles; Lovable updates Bun's, the VPS Dockerfile uses npm's.
- The `--package-lock-only` flag rewrites `package-lock.json` without touching `node_modules`, keeping the operation fast and side-effect free in the sandbox.
- The `||` fallback in the Dockerfile preserves `npm ci`'s reproducibility benefits when the lockfile is good, but won't hard-fail the deployment when it isn't — a worthwhile trade-off for a Lovable + VPS hybrid workflow.

