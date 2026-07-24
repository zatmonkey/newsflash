# n8n-nodes-newsflash

n8n community nodes for [Newsflash](https://newsflash.sh) — real-time corroborated
news events + 5-year archive, for agents. Free tier, no key.

Newsflash crawls news sources and dedupes them into an **event graph**: one
happening, its corroborating sources, and a confidence score
(`min(1, sources / 3)`). These nodes give n8n workflows the same surface the
Newsflash API, CLI, and MCP server expose.

## Installation

Self-hosted n8n (community nodes are not available on n8n Cloud):

1. Open **Settings → Community Nodes**.
2. Choose **Install**, enter `n8n-nodes-newsflash`, and confirm.

Or from the command line of your n8n instance:

```sh
npm install n8n-nodes-newsflash
```

More on community nodes: <https://docs.n8n.io/integrations/community-nodes/installation/>

## Credentials (optional)

The **Newsflash API** credential holds a single API key, and it is optional:

- **No credential / empty key** — requests run on the keyless test tier
  (24h history, per-IP rate limits). Great for trying things out.
- **Free key** (email OTP at [newsflash.sh/docs](https://newsflash.sh/docs)) — 30 days
  of history and higher limits.
- **Premium** — unlimited history depth.

The key is sent as `Authorization: Bearer <key>`.

## Nodes

### Newsflash

| Operation | Endpoint | Description |
| --- | --- | --- |
| Get Events | `GET /api/events` | Query deduplicated events. Filters: search query, semantic search, category, from/to, source, limit. |
| Get Event | `GET /api/events/:id` | One event by ID, with its corroborating articles. |
| Search Articles | `GET /api/articles` | Search the raw article layer beneath the event graph. |
| List Sources | `GET /api/sources` | The sources Newsflash crawls. |
| Get Stats | `GET /api/stats` | Corpus-wide statistics. |

Categories: `crypto`, `tradfi`, `business`, `tech`, `politics`, `world`,
`science`, `health`, `energy`, `sports`.

Every event carries `corroboration` (distinct sources) and `confidence`
(`min(1, corroboration / 3)`).

### Newsflash Trigger

A polling trigger over `GET /api/events`. On each poll it:

1. Fetches recent events (optionally filtered by category).
2. Drops events below **Minimum Corroboration**.
3. Dedupes against previously seen event IDs (workflow static data) and emits
   only what changed: unseen events as `eventType: "event.new"`, and — if
   **Emit Corroboration Updates** is on — known events that gained sources as
   `eventType: "event.corroborated"`.

Set the poll interval on the node's **Poll Times**. The first poll after
activation primes the dedupe store without emitting (manual test runs always
return the current batch).

> **Real-time note:** Newsflash also has a push SSE stream
> (`GET /api/stream`) that emits `event.new` / `event.corroborated` the moment
> clustering commits. n8n community polling triggers cannot hold long-lived
> SSE connections, so this trigger polls; use the SSE stream from a
> long-running consumer (the `newsflash` CLI, MCP, or your own service) when
> you need sub-minute latency.

## Compatibility

Requires n8n running Node.js >= 20.15. Built and linted against the official
[n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter) conventions
(`eslint-plugin-n8n-nodes-base`).

## Resources

- Newsflash docs: <https://newsflash.sh/docs>
- Source list: <https://newsflash.sh/sources>
- n8n community nodes docs: <https://docs.n8n.io/integrations/community-nodes/>

## License

[MIT](../../LICENSE)
