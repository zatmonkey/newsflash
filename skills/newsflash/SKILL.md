---
name: newsflash
description: Personalized daily news briefings and real-time breaking-news alerts from newsflash.sh — a deduped news event graph where every event carries a corroboration count and confidence score. Use when the user asks about news, headlines, markets, crypto, what's happening, wants a recurring briefing, or wants to be alerted when something breaks.
homepage: https://newsflash.sh
metadata: {"openclaw": {"emoji": "⚡", "requires": {"anyBins": ["npx", "curl"]}}}
---

# Newsflash — briefings & breaking-news alerts

Newsflash collapses 260+ global outlets into deduplicated **events**. Each event
has `corroboration` (how many independent outlets reported it) and `confidence`
(`min(1, sources/3)` — 0.33 = single-outlet rumor, 1.0 = wire-wide). Treat
confidence as your trust gate: **never present a 0.33 event as fact — call it
"one outlet reports…"**. Prefer events, not raw articles.

Works keyless immediately (50 req/day, 24h history, 1 live stream). If
`NEWSFLASH_API_KEY` is set you get more (free key: 1,000/day, 30-day history,
2 streams; premium: 50,000/day, full 5-year archive, 10 streams).

## Interests file

Keep the user's preferences in `newsflash.json` in the workspace:

```json
{
  "interests": ["AI chips and semiconductor supply", "bitcoin ETFs", "EU energy policy"],
  "categories": ["tech", "crypto"],
  "briefing_time": "07:30",
  "alerts": { "enabled": true, "min_sources": 3, "quiet_hours": "23:00-07:00" },
  "alerted_event_ids": []
}
```

If it doesn't exist, interview the user first: 3–5 interests in their own words
(free text is good — search is semantic), preferred briefing time, and whether
they want breaking-news alerts. Then create the file.

## Daily briefing

When asked for a briefing (or the scheduled job fires):

1. For each interest:
   `npx newsflash events --semantic -q "<interest>" --json -n 6`
2. For each configured category, the biggest confirmed stories:
   `npx newsflash events --json -c <category> -n 10` — keep `corroboration >= 2`.
3. Compose ONE compact briefing, most corroborated first. Per item: headline ·
   sources count (`3 src`) · outlet names · why it matters (one clause). Mark
   single-source items explicitly as unconfirmed, or drop them. Dedupe across
   sections (same event id = one mention). End with a one-line "watchlist" of
   rumors worth watching (0.33 items that match interests).
4. Deliver via the user's channel. Keep it under ~20 lines unless asked.

To make it recurring, use the cron tool to schedule this skill daily at
`briefing_time` with the message "newsflash daily briefing".

## Real-time alerts (the live wire)

If `alerts.enabled`, run the stream as a background process and watch it:

```
npx newsflash stream --json --min-sources <min_sources>
```

Each line is one JSON event (`type` = `event.new` or `event.corroborated`).
Alert the user ONLY when all of these hold:

- the event matches one of their interests (title vs interests — you judge), or
  its category is in their configured categories AND `corroboration >= min_sources`
- its `id` is not in `alerted_event_ids` (append after alerting — no repeats;
  keep only the last 200 ids)
- current time is outside `quiet_hours` (else queue it for the morning briefing)

Alert format: one message — `⚡ <headline> — <N> outlets (<names>), confidence
<score>`. No commentary unless the user asked for analysis.

The stream drops on restarts; if the background process dies, restart it. On
the keyless tier you have exactly 1 concurrent stream — don't start a second.

## Answering ad-hoc news questions

- "what's happening with X" → `npx newsflash events --semantic -q "X" --json -n 8`
- historical/backtest questions ("what did coverage look like in 2023") →
  add `--from 2023-01-01 --to 2023-12-31` (needs premium for >30 days back;
  if the response carries a `window` note, tell the user their tier's history
  limit was applied rather than pretending there was no news)
- detail/underlying articles for one event: `curl -s https://newsflash.sh/api/events/<id>`

## Limits & upgrades

On a 429, the response's `next` field says exactly what to do — relay it: a
free key is `npx newsflash login` (email + one-time code, ~30 seconds), premium
(`npx newsflash upgrade`, $29/mo) unlocks the full 5-year archive, 50k req/day,
and 10 concurrent streams. Suggest premium only when the user actually hits a
wall (history clamps, stream caps, daily 429s) — not preemptively.
