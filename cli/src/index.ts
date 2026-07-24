#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

// Newsflash CLI — a standalone, zero-dependency HTTP client of the hosted
// Newsflash service (newsflash.sh). Agents (e.g. OpenClaw) and humans install it
// with `npm i -g newsflash` or run it with `npx newsflash`; --api /
// NEWSFLASH_API_URL exist for tests and non-default deployments.

const VERSION = "0.3.1";
const DEFAULT_API = "https://newsflash.sh";

const HELP = `newsflash — query the Newsflash news & signal event graph

Usage
  newsflash <command> [options]

Commands
  events            Query the deduped event graph (the primary view)
  articles          Search raw articles
  sources           List tracked sources
  stats             Corpus size & freshness
  stream            Live SSE stream of events as they break (Ctrl-C to stop)
  login [email]     Get a free API key (emailed one-time code)
  me                Show your tier and usage
  upgrade           Get a premium checkout link
  logout            Forget the stored API key
  ingest            Trigger a crawl + clustering cycle (operators only)

Options
  --api <url>       Newsflash API base URL   (env NEWSFLASH_API_URL, default ${DEFAULT_API})
  --key <key>       API key                  (env NEWSFLASH_API_KEY, or stored by 'login')
  --json            Emit raw JSON — recommended when an agent is parsing output
  --semantic        Rank by meaning, not keywords (with -q) — adds a relevance score
  -q, --query <t>   Theme / keyword           (events, articles, stream)
  -s, --source <s>  Source slug               (events, articles)
  -c, --category    crypto|tradfi|business|tech|politics|world|science|health|energy|sports
      --min-sources <n>  (stream) only push events corroborated by ≥ n outlets
      --from <d>    ISO start date            (events)
      --to <d>      ISO end date              (events)
  -n, --limit <n>   Max results (default 20)
  -h, --help        Show this help
  -V, --version     Show version

Tiers
  no key   50 req/day · 24h lookback   (test drive)
  free   1000 req/day · 30d lookback   ('newsflash login' — just an email)
  premium 50k req/day · 5y archive     ('newsflash upgrade')

Examples
  newsflash stream -c crypto --min-sources 2
  newsflash events -q "etf" -c crypto -n 5
  newsflash events --json -q fed | jq '.[0].sources'
  newsflash events --semantic -q "monetary easing"
  newsflash login you@example.com
`;

const CONFIG_DIR = join(homedir(), ".config", "newsflash");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function loadStoredKey(): string | undefined {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")).apiKey || undefined;
  } catch {
    return undefined;
  }
}

function storeKey(apiKey: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2) + "\n", { mode: 0o600 });
}

interface ApiOpts {
  method?: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  key?: string;
}

async function api(base: string, path: string, opts: ApiOpts = {}): Promise<any> {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  // Queries are fast; ingest runs a full crawl+cluster cycle on the backend.
  const timeoutMs = path === "/api/ingest" ? 300_000 : 30_000;
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.key) headers.authorization = `Bearer ${opts.key}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new Error(
        `The Newsflash API at ${base} did not respond within ${timeoutMs / 1000}s for ${path}. ` +
          `The backend may be stalled — check its logs.`,
      );
    }
    throw new Error(
      `Cannot reach the Newsflash API at ${base} (${e.message}). ` +
        `Check your connection — or, if you're targeting a non-default deployment, ` +
        `check --api / NEWSFLASH_API_URL.`,
    );
  }
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = payload?.error ? `: ${payload.error}` : "";
    const hint = payload?.hint ? `\n  hint: ${payload.hint}` : "";
    throw new Error(`Newsflash API responded ${res.status}${detail}${hint}`);
  }
  return payload;
}

function fmtWhen(ts: string | null): string {
  return ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 16) : "—";
}

async function login(base: string, emailArg: string | undefined): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = emailArg || (await rl.question("email: "));
    const sent = await api(base, "/api/auth/request-code", { method: "POST", body: { email } });
    if (sent.devCode) {
      console.log(`(dev mode — backend has no email provider; your code is ${sent.devCode})`);
    } else {
      console.log(`Code sent to ${email} — check your inbox.`);
    }
    const code = await rl.question("6-digit code: ");
    const result = await api(base, "/api/auth/verify", { method: "POST", body: { email, code: code.trim() } });
    storeKey(result.apiKey);
    console.log(`\n✓ Logged in (${result.tier} tier). Key stored in ${CONFIG_PATH}`);
    console.log(`  For agents/CI, set: NEWSFLASH_API_KEY=${result.apiKey}`);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      api: { type: "string" },
      key: { type: "string" },
      json: { type: "boolean", default: false },
      query: { type: "string", short: "q" },
      semantic: { type: "boolean", default: false },
      "min-sources": { type: "string" },
      source: { type: "string", short: "s" },
      category: { type: "string", short: "c" },
      from: { type: "string" },
      to: { type: "string" },
      limit: { type: "string", short: "n", default: "20" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "V", default: false },
    },
  });

  if (values.version) {
    console.log(VERSION);
    return;
  }
  const command = positionals[0];
  if (values.help || !command) {
    console.log(HELP);
    return;
  }

  const base = (values.api ?? process.env.NEWSFLASH_API_URL ?? DEFAULT_API).replace(/\/+$/, "");
  const key = values.key ?? process.env.NEWSFLASH_API_KEY ?? loadStoredKey();
  const json = values.json;
  const listQuery = {
    q: values.query,
    semantic: values.semantic ? "1" : undefined,
    source: values.source,
    category: values.category,
    from: values.from,
    to: values.to,
    limit: values.limit,
  };

  switch (command) {
    case "events": {
      const { events } = await api(base, "/api/events", { query: listQuery, key });
      if (json) return void console.log(JSON.stringify(events, null, 2));
      if (!events.length) return void console.log("No events found.");
      for (const e of events) {
        const bar = "●".repeat(Math.max(1, e.corroboration));
        const rel = e.relevance !== undefined ? `  ·  ${Math.round(e.relevance * 100)}% match` : "";
        console.log(
          `\n[${e.id}] ${e.canonical_title}\n` +
            `    ${e.category}  ·  ${fmtWhen(e.last_seen_at)}  ·  ${e.corroboration} src ${bar}${rel}  ·  ${e.sources.join(", ")}`,
        );
      }
      console.log(`\n${events.length} event(s).`);
      return;
    }
    case "stream": {
      const url = new URL(base + "/api/stream");
      if (values.query) url.searchParams.set("q", values.query);
      if (values.category) url.searchParams.set("category", values.category);
      if (values["min-sources"]) url.searchParams.set("min_corroboration", values["min-sources"]);
      const headers: Record<string, string> = { accept: "text/event-stream" };
      if (key) headers.authorization = `Bearer ${key}`;
      // Long-lived by design: no timeout signal on this request.
      const res = await fetch(url, { headers });
      if (!res.ok || !res.body) {
        const payload: any = await res.json().catch(() => ({}));
        throw new Error(`Newsflash API responded ${res.status}${payload?.error ? `: ${payload.error}` : ""}`);
      }
      if (!json) console.log(`streaming events${values.category ? ` · ${values.category}` : ""} — Ctrl-C to stop\n`);
      const dec = new TextDecoder();
      let buf = "";
      for await (const chunk of res.body) {
        buf += dec.decode(chunk as Uint8Array, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const type = frame.match(/^event: (.+)$/m)?.[1];
          const data = frame.match(/^data: (.+)$/m)?.[1];
          if (!type || !data) continue; // heartbeats/comments
          const e = JSON.parse(data);
          if (json) {
            console.log(JSON.stringify({ type, ...e }));
          } else {
            const tag = type === "event.new" ? "NEW " : `+SRC`;
            const bar = "●".repeat(Math.max(1, Math.min(5, e.corroboration)));
            console.log(
              `[${tag}] ${e.canonical_title}\n       ${e.category}  ·  ${e.corroboration} src ${bar}  ·  ${e.sources.join(", ")}`,
            );
          }
        }
      }
      return;
    }
    case "articles": {
      const { articles } = await api(base, "/api/articles", { query: listQuery, key });
      if (json) return void console.log(JSON.stringify(articles, null, 2));
      if (!articles.length) return void console.log("No articles found.");
      for (const a of articles) {
        console.log(`\n${a.title}\n    ${a.source}  ·  ${fmtWhen(a.published_at)}\n    ${a.url}`);
      }
      console.log(`\n${articles.length} article(s).`);
      return;
    }
    case "sources": {
      const rows = await api(base, "/api/sources", { key });
      if (json) return void console.log(JSON.stringify(rows, null, 2));
      for (const s of rows) {
        console.log(
          `${s.slug.padEnd(16)} ${s.category.padEnd(8)} ${String(s.article_count).padStart(5)}  ${fmtWhen(s.latest)}  ${s.name}`,
        );
      }
      return;
    }
    case "stats": {
      const s = await api(base, "/api/stats", { key });
      if (json) return void console.log(JSON.stringify(s, null, 2));
      console.log(
        `sources: ${s.sources}  articles: ${s.articles}  events: ${s.events}  latest: ${fmtWhen(s.latest)}`,
      );
      return;
    }
    case "login":
      return login(base, positionals[1]);
    case "logout": {
      rmSync(CONFIG_PATH, { force: true });
      console.log("Stored key removed.");
      return;
    }
    case "me": {
      if (!key) throw new Error("no API key — run 'newsflash login' first");
      const me = await api(base, "/api/me", { key });
      if (json) return void console.log(JSON.stringify(me, null, 2));
      console.log(`${me.email} · ${me.tier} tier · ${me.used_today}/${me.limit} requests today`);
      return;
    }
    case "upgrade": {
      if (!key) throw new Error("no API key — run 'newsflash login' first");
      const { url } = await api(base, "/api/billing/checkout", { method: "POST", key });
      console.log(`Open this link to upgrade to premium:\n\n  ${url}\n`);
      return;
    }
    case "ingest": {
      const r = await api(base, "/api/ingest", { method: "POST", key });
      if (json) return void console.log(JSON.stringify(r, null, 2));
      console.log(
        `✓ +${r.inserted} articles, +${r.eventsCreated} events, ${r.eventsAttached} attached (${r.ms}ms)`,
      );
      return;
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[newsflash]", (err as Error).message);
  process.exitCode = 1;
});
