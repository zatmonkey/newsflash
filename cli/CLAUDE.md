# newsflash (CLI package)

The standalone CLI published to npm as **`newsflash`**. It is a thin HTTP client of a
Newsflash backend (`--api` / `NEWSFLASH_API_URL`, default `https://newsflash.sh`).
The backend is a hosted service — README and user-facing CLI text must not
suggest self-hosting (no docker/localhost instructions).

## Hard constraints

- **Zero runtime dependencies.** Node ≥ 20 built-ins only: `node:util` `parseArgs` for
  flags, global `fetch` (with `AbortSignal.timeout`) for HTTP. Do not add packages —
  agents install this in constrained environments; install weight and supply-chain
  surface both matter.
- **No database access, ever.** If a feature needs data the API doesn't expose, add an
  endpoint to the backend first (`../src/api/server.ts`), then consume it here.
- **`--json` output is machine contract.** Agents parse it; changing shapes is a
  breaking change → major version bump.
- Keep fetch timeouts: 30s for queries, 300s for `/api/ingest`.
- **Auth**: key resolution order is `--key` → `NEWSFLASH_API_KEY` → `~/.config/newsflash/config.json`
  (written by `login` with mode 0600). `login` drives the email-OTP flow; `upgrade`
  prints the Stripe checkout URL (never opens a browser — agents run this too).
- Default API base is `https://newsflash.sh`; tests and local dev override with
  `NEWSFLASH_API_URL`.

## Publishing

```bash
npm version patch   # or minor/major
npm publish         # prepublishOnly runs tsc → dist/
```

`bin` points at `dist/index.js`; the `files` whitelist ships only `dist/` + README.
Test the built artifact before publishing: `npm run build && node dist/index.js stats`.
The parent repo's `npm test` includes CLI user-flow tests (spawned as a real process).
