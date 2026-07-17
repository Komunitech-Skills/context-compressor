# 💾⚡ Smart Cache Pro — automatic token discipline for OpenClaw

> 🔒 **Diaudit & aman** — lolos skill-gate 100/100 · berjalan **lokal-saja**: tanpa panggilan jaringan, tanpa `eval`/kode ter-obfuscate. Semua kode terbuka & bisa kamu verifikasi sendiri. _(Audit keamanan: 2026-07-17)_

An OpenClaw **plugin** that gives your agent automatic token discipline. It compresses verbose
tool output and snapshots context before compaction — **at the runtime, automatically**: no
manual piping, no "remember to compress" prompts, no relying on the agent to behave.

## What it's for

LLM agents bleed tokens — and lose context — in two predictable ways. Smart Cache Pro plugs
both **automatically, at the runtime** (no prompting, no relying on the agent to behave):

**1. Verbose tool output drains your context budget.** One `git diff`, log tail, `grep`, or
directory listing can dump hundreds of lines into the window — and that context is re-sent on
*every* later turn, so a single fat dump keeps costing tokens all session. → Pro compresses
each big tool result *before it enters context* (dedup / group / smart-truncate), tee-ing the
full output to disk so nothing is lost.

**2. Compaction quietly eats your context.** When the window fills, OpenClaw trims/summarizes
old messages — and decisions, specs, and findings can vanish *unless the agent saved them
first* (it usually doesn't). → Pro snapshots the about-to-be-compacted messages to disk the
instant compaction fires.

## When you'd want it
- Your agent runs lots of shell / file / search tools with **big outputs**.
- You're **token- or context-constrained** (small/cheap model, or long sessions).
- You want a **set-and-forget** guardrail, not a discipline you have to trust the model to follow.

## When you *wouldn't* (honest fit)
- If you already run a **sophisticated memory/curation system** (curator + semantic memory, etc.),
  the **snapshot half is largely redundant** — but the **compress half still saves tokens**.
- If your agent rarely produces big tool dumps, the savings are marginal.

## What you get
- **Lower token spend** — verbose output shrinks before it hits context; signal kept, not blindly cut.
- **Nothing lost** — full output tee'd to disk (an `[full output: …]` pointer is left inline) + pre-compaction snapshot.
- **Zero behavior change** — the agent just sees smaller tool results; defensive by design (on any error it returns the original, so it can never break a tool call).
- **Receipts** — every compression is logged; run `node scripts/report.mjs` to see the tokens you actually saved (see *Proof* below).

## Example: before → after

The agent runs `git diff` and the tool dumps **13 lines**:
```diff
diff --git a/src/app.js b/src/app.js
index 3f1a2b..8c4d9e 100644
--- a/src/app.js
+++ b/src/app.js
@@ -12,7 +12,7 @@ function handleRequest(req, res) {
   const user = req.user;
   const data = await fetchData(user.id);
   logger.info("fetched");
-  return res.json(data);
+  return res.json({ ...data, cached: true });
   // unreachable
 }
```

What actually **enters the agent's context** — just the file markers + the real change:
```diff
--- a/src/app.js
+++ b/src/app.js
-  return res.json(data);
+  return res.json({ ...data, cached: true });
[full output: ~/.openclaw/workspace/memory/cache/tee/out-20260612093012-6350-0.log]
```

**13 lines → 4.** The full diff stays on disk (the `[full output: …]` pointer); the agent
reads it only if it needs the surrounding context. Other modes: **logs** dedup repeats
(`GET /health 200  (×200)`) and surface errors; **grep** groups hits by file
(`app.js: 12, 48, 91`); oversized generic output is head+tail-trimmed with an elision marker.

## Two engines, both automatic
1. **Auto-compress** — a live `agentToolResultMiddleware` compresses every verbose tool result
   (RTK-style: dedup / group-by-file / smart-truncate) **before it enters context**. The full
   output is tee'd to disk first, so nothing is ever lost. Zero agent action. (A
   `tool_result_persist` hook is kept as a backward-compatible fallback.)
2. **Pre-compaction snapshot** — a `before_compaction` hook deterministically snapshots the
   about-to-be-compacted messages to `memory/cache/.compaction/`, and audits each compaction.
   Nothing depends on the agent remembering to save.

> **Runtime coverage (important).** Engine A hooks OpenClaw's native tool-result seam
> (`agentToolResultMiddleware`), so it applies to agents on the **`openclaw`** and **`codex`**
> runtimes. Agents backed by the **Claude CLI** (`provider=claude-cli`, e.g. Claude Max) execute
> their tools *inside the Claude CLI process*, so those tool results never reach OpenClaw's
> middleware — such agents get **Engine B (pre-compaction snapshot) only**. Engine B works on every
> backend.

## Proof — what you actually saved

Every compression is logged to `memory/cache/stats.jsonl` (one line each). Print a report
anytime — no OpenClaw needed, no extra deps:

```bash
node scripts/report.mjs            # full report (today + all-time)
node scripts/report.mjs --brief    # one-line summary
node scripts/report.mjs --rate 15  # also show est. cost saved at $15 / 1M tokens (your number)
```

```text
  COMPRESSION (tool output)              today        all-time
  ────────────────────────────────────────────────────────────
  tool dumps compressed                     38             412
  lines  in → out                 6,910 → 1,204   78,330 → 12,668
  lines saved                            5,706          65,662
  est. tokens saved  (~chars÷4)         ~46.6k          ~512k
  avg compression                          83%             84%
```

Token figures are **estimates** (`chars ÷ 4`), not billed counts — kept honest on purpose. Full
outputs stay in `memory/cache/tee/`, so nothing the report counts as "saved" is ever actually lost.

## Install
```bash
openclaw plugins install git:rin-proxy/smart-cache-pro
openclaw plugins enable smart-cache-pro
```
Then **restart your OpenClaw gateway** so it loads the plugin (it also loads on the next gateway
start). Verify with `openclaw plugins inspect smart-cache-pro --runtime` → `status: loaded`.
(`inspect` lists the typed hooks but does **not** surface middleware registrations — to confirm
Engine A end-to-end, run a >40-line tool output and check that `memory/cache/tee/` gets a file and
`memory/cache/stats.jsonl` gets a row.) Remove anytime:
`openclaw plugins uninstall smart-cache-pro --force`.

### Config (optional)
Set under the plugin's config in your `openclaw.json`:
```json
{ "plugins": { "entries": { "smart-cache-pro": {
  "config": { "minLines": 40, "denyTools": ["read"] }
} } } }
```
- `minLines` (default `40`) — only compress tool output with at least this many lines.
- `denyTools` (default `[]`) — tools whose output must stay verbatim (never compressed).
- `teeDir` — where full outputs are saved (default `<workspace>/memory/cache/tee`).
- `retentionDays` (default `14`) — on load, prune `tee/` outputs + `.compaction/` snapshots older than this. `0` = keep forever.
- `enabled` (default `true`).

> **Disk use:** full tool outputs are written to `memory/cache/tee/`, pre-compaction snapshots to
> `memory/cache/.compaction/`, and the savings ledger to `memory/cache/stats.jsonl`. As of v0.3.0 the
> first two are **auto-pruned** on load past `retentionDays` (the `audit.log` and the ledger are kept).

## Test the compressor standalone (no OpenClaw needed)
```bash
node test/compress.test.mjs
```

## Why a plugin (not a script you pipe through)
| | Manual / advisory approach | Smart Cache Pro |
|---|---|---|
| Compress verbose output | you remember to pipe it through a script | **automatic** — a live `agentToolResultMiddleware` rewrites it for you |
| Save before compaction | you hope the agent flushes in time | **deterministic** — `before_compaction` snapshots it |
| How | an observe-only file-hook can only *nudge* | a **typed plugin** *intercepts and rewrites* |

## Status
**v0.4.1** — grounded against `openclaw@2026.7.1` middleware + hook types; **verified live on a real
2026.7.1 gateway** (loads, registers the middleware); compressor unit-tested (9/9) + middleware
integration-tested (14/14). savings ledger + `scripts/report.mjs` (v0.2.0); retention/auto-cleanup (v0.3.0).

**Fix for #1 (Engine A inert on 2026.6.x).** `tool_result_persist` is not a live tool-output
interceptor on modern OpenClaw — in 2026.6.x its only caller is the compaction transcript rebuild,
so on interactive main-agent runs it never fired (no compression / no tee / no ledger). Engine A now
uses the runtime-neutral **`agentToolResultMiddleware`**, which fires live on every tool result in
the normal agent loop; `tool_result_persist` is kept as a backward-compatible fallback. Verified on
a real OpenClaw 2026.6.6 gateway: a 150-line `seq` output was auto-compressed live, the full output
tee'd, and a `stats.jsonl` row written.

Prior: **Gate-1/Gate-2 PASSED** on OpenClaw 2026.5.28 (loads, hooks register, a 150-line `seq`
output auto-compressed + tee'd). The subagent-hook gap tracked upstream in
[openclaw#60209](https://github.com/openclaw/openclaw/issues/60209) is addressed by the middleware
path, which fires for main-agent and subagent runs alike.

*By Rin.*
