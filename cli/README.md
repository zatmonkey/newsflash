# newsflash

**Five years of corroborated news events, queryable from your shell.** The
command-line client for [newsflash.sh](https://newsflash.sh) — a hosted service
that watches 260+ outlets worldwide and collapses them into a deduped **event
graph**: one happening, its corroborating sources, and a confidence score — live
to the minute, archived five years deep. Built for autonomous agents; pleasant
for humans.

```bash
npm i -g newsflash        # or: npx newsflash <command>
```

Works out of the box — no account, no config, no server to run:

```bash
newsflash events -q "etf" -c crypto -n 5
newsflash stats
```

## Get a free API key

The keyless tier is a test drive (50 requests/day, last 24h of news). A free key
takes one email round-trip:

```bash
newsflash login you@example.com   # emails a one-time code, stores the key locally
newsflash me                      # shows your tier and today's usage
```

| tier | requests/day | history | how |
| --- | --- | --- | --- |
| test | 50 | 24 h | nothing — just run it |
| free | 1,000 | 30 days | `newsflash login` |
| premium | 50,000 | full archive (5 years, growing) | `newsflash upgrade` — $29/mo |

## Commands

| Command | What |
| --- | --- |
| `newsflash events` | Query the deduped event graph (the primary view) |
| `newsflash articles` | Search raw articles |
| `newsflash sources` | List tracked sources |
| `newsflash stats` | Corpus size & freshness |
| `newsflash login [email]` | Get a free API key (emailed one-time code) |
| `newsflash me` | Show your tier and usage |
| `newsflash upgrade` | Print a premium checkout link |
| `newsflash logout` | Forget the stored API key |

## Options

```
--api <url>       API base URL     (env NEWSFLASH_API_URL, default https://newsflash.sh)
--key <key>       API key          (env NEWSFLASH_API_KEY, or stored by 'login')
--json            Emit raw JSON — recommended when an agent parses output
-q, --query <t>   Theme / keyword
-s, --source <s>  Source slug
-c, --category    crypto | tradfi | business | tech | politics | world |
                  science | health | energy | sports
    --from <d>    ISO start date
    --to <d>      ISO end date
-n, --limit <n>   Max results (default 20)
-h, --help / -V, --version
```

## For agents

Use `--json` for machine-readable output:

```bash
newsflash events --json -q "fed" -c tradfi | jq '.[0] | {title: .canonical_title, sources}'
```

Prefer MCP? The same event graph is served over Model Context Protocol at
`https://newsflash.sh/mcp` (Streamable HTTP — works with Claude, Cursor, and any
MCP client; pass your key as a `Bearer` token for free/premium limits). Full
integration guides: [newsflash.sh/docs](https://newsflash.sh/docs).

## Zero dependencies

No runtime dependencies — just Node ≥ 20 (built-in `fetch` and `node:util`
argument parsing). Nothing to audit, nothing to pull in.

---

[docs](https://newsflash.sh/docs) · [sources](https://newsflash.sh/sources) ·
[privacy](https://newsflash.sh/privacy) · [terms](https://newsflash.sh/terms) ·
contact@newsflash.sh
