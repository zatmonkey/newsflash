<p align="center"><img src="icon-400.png" width="96" alt="Newsflash" /></p>

# Newsflash

[![npm](https://img.shields.io/npm/v/newsflash)](https://www.npmjs.com/package/newsflash)
[![smithery badge](https://smithery.ai/badge/newsflash/newsflash)](https://smithery.ai/servers/newsflash/newsflash)

**Five years of corroborated news events, queryable by agents.**
[newsflash.sh](https://newsflash.sh) watches 260+ outlets across geographies and
languages and collapses the noise into a **deduped event graph** — one happening,
every source that corroborated it, a confidence score — live to the minute and
**backfilled five years deep**, so agents can backtest on history and act on the
wire. Served over **MCP**, a **CLI**, a **real-time SSE stream**, and a plain
**HTTP API**.

Humans read; agents query. No account needed to start.

```bash
# keyless test drive — 50 requests/day, straight from your shell
npx newsflash events -q "etf" -c crypto -n 5
npx newsflash stream -c crypto --min-sources 2   # the live wire, corroborated only
curl "https://newsflash.sh/api/events?q=fed&category=tradfi&limit=5"
```

## MCP (primary — for agents)

The event graph is served over MCP's Streamable HTTP transport at
`https://newsflash.sh/mcp` — listed in the official MCP registry as
`sh.newsflash/newsflash`. Point any MCP host at it:

```jsonc
// Claude Code / Claude Desktop — remote MCP server
{
  "mcpServers": {
    "newsflash": {
      "type": "http",
      "url": "https://newsflash.sh/mcp",
      "headers": { "Authorization": "Bearer nf_your_key" }   // optional — raises limits
    }
  }
}
```

Claude Code plugin install:

```
/plugin marketplace add zatmonkey/newsflash
/plugin install newsflash@newsflash
```

The endpoint is stateless (each request independent). Tools: `get_events`,
`get_event`, `search_articles`, `list_sources`, `corpus_stats`. Setup guides for
Claude, Cursor, ChatGPT and other hosts: [newsflash.sh/docs](https://newsflash.sh/docs).

## OpenClaw

A ready-made skill ships in this repo ([`skills/newsflash/`](skills/newsflash/)) —
personalized daily briefings + real-time breaking-news alerts:

```
openclaw skills install git:zatmonkey/newsflash --as newsflash
```

Then tell your agent "set up my news briefing". It interviews you for interests,
schedules a daily brief, and (if you enable alerts) watches the live stream and
pings you when a story crosses your corroboration threshold.

## CLI

A standalone, **zero-dependency** npm package ([`./cli`](cli/), published as
[`newsflash`](https://www.npmjs.com/package/newsflash)):

```bash
npm i -g newsflash

newsflash events -q "etf" -c crypto --from 2026-07-10 -n 5
newsflash events --json -q fed | jq '.[0].sources'   # --json for agents
newsflash sources
newsflash stats
newsflash login you@example.com    # free API key via emailed one-time code
newsflash me                       # tier + today's usage
```

## HTTP API

Base URL `https://newsflash.sh`:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/events?q=&source=&category=&from=&to=&limit=` | Deduped events |
| GET | `/api/events/:id` | One event + corroborating articles |
| GET | `/api/articles?…` | Raw article search |
| GET | `/api/sources` | Tracked sources + counts |
| GET | `/api/stats` · `/api/health` | Corpus size & freshness |
| GET | `/api/stream` | **Real-time SSE push** — `event.new` / `event.corroborated` as clustering commits |
| POST | `/mcp` | MCP server (Streamable HTTP) — the agent-facing surface |

Categories: `crypto` `tradfi` `business` `tech` `politics` `world` `science`
`health` `energy` `sports`.

## Tiers

| Tier | Auth | Limit | How |
| --- | --- | --- | --- |
| **test** | none | 50 req/day (per IP) · 24h lookback · 1 stream | just call the API or MCP endpoint |
| **free** | API key | 1,000 req/day · 30-day lookback · 2 streams | `newsflash login` — email + one-time code |
| **premium** | subscription | 50,000 req/day · **full 5-year archive** · 10 streams | `newsflash upgrade` — $29/mo |

Pass the key as `Authorization: Bearer nf_…` (or `x-api-key`) — same gate for REST
and `/mcp`. Every response carries `X-RateLimit-Limit` / `X-RateLimit-Remaining` /
`X-Newsflash-Tier`; limits reset at midnight UTC. Keys are shown once and stored
only as hashes.

## How the event graph works

New articles are normalized and matched against recent events using trigram
similarity — **across categories**, so a crypto outlet and a tradfi outlet
reporting the same happening corroborate one event. Above the similarity
threshold → the article attaches to the event and bumps its corroboration;
otherwise it seeds a new event. `confidence = min(1, distinct_sources / 3)` — an
event corroborated by 3+ independent outlets maxes out.

That makes the graph a *signal* instrument: agents can distinguish a
single-outlet rumor (`confidence 0.33`) from a story the whole press corps is
running (`confidence 1.0`, sources listed), and query the full archive to
backtest on history.

## About this repository

This repo holds the open-source (MIT) client surface of Newsflash: the
zero-dependency **CLI** ([`cli/`](cli/)), the **Claude Code plugin** manifests
([`.claude-plugin/`](.claude-plugin/)), and the **MCP registry manifest**
([`server.json`](server.json)). The Newsflash backend is a hosted service
operated at [newsflash.sh](https://newsflash.sh) and is not part of this
repository.

CLI development: `cd cli && npm install && npm run build && node dist/index.js stats`.
No runtime dependencies — Node ≥ 20 built-ins only.

---

[docs](https://newsflash.sh/docs) · [sources](https://newsflash.sh/sources) ·
[privacy](https://newsflash.sh/privacy) · [terms](https://newsflash.sh/terms) ·
contact@newsflash.sh
