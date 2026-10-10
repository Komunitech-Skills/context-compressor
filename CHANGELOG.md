# Changelog

## 1.0.2 - 2026-10-10

- Compress long plain-text stdout inside OpenClaw Code Mode exec transport envelopes.
- Preserve valid JSON envelopes, arbitrary command JSON, structured results, research and handoffs.
- Record `transport` in compression receipts to distinguish direct and Code Mode results.

## 1.0.1 - 2026-09-29

- Declare passive plugin activation and exclude it from skill discovery.

## 1.0.0 — 2026-09-28

- Rename the plugin and package ID to `context-compressor`.
- Add atomic config migration with dry-run, duplicate-ID refusal and rollback.
- Preserve lossless research, structured results and agent handoffs.


## 2026-09-14 — Audit acceptance

- Document private-repository access, explicit prerequisites, functional expectations and recovery limits.
- Add one offline test entrypoint and CI; distinguish runtime/behavior evidence from installation status.


- Limit default compression to shell/process tools with an explicit allowTools control.
- Preserve valid JSON and structured tool results; retain denyTools precedence.
- Add regression coverage for agent handoffs, research evidence, transcript persistence and unchanged inputs.

## 0.4.3

- Treat an explicit workspaceByAgent mapping as an agent allowlist across tool middleware, persistence and compaction hooks. Runtime workspace discovery cannot opt unlisted agents into compression.
- Retain automatic discovery when the mapping is omitted; an empty mapping disables processing.

## 2026-09-11 integration remediation

Compress verbose tool output only after preserving the complete result in the owning workspace. Unknown scope or write failure preserves the original. Agent/run/session isolation, private output files, bounded ledger and activity-driven retention are included.

Explicit workspace selection, reversible lifecycle and regression coverage; install status does not imply runtime readiness.

— context-compressor

## 0.4.1 (2026-07-16)
- Verified live on **OpenClaw 2026.7.1**: plugin loads, `register()` runs, and the live
  `agentToolResultMiddleware` registers (event/return types match 2026.7.1 exactly). Build metadata
  bumped `2026.6.6 → 2026.7.1`.
- Documented Engine A **runtime coverage** in the README: it hooks OpenClaw's native tool-result
  seam (runtimes `openclaw`/`codex`). Agents on the **Claude CLI** backend execute tools inside that
  process, so those results never reach the middleware — they get **Engine B (pre-compaction
  snapshot) only**. Engine B works on every backend.

## 0.4.0 (2026-07-08)
- **Fix #1 — Engine A was inert on OpenClaw 2026.6.x.** `tool_result_persist` is not a live
  tool-output interceptor on modern OpenClaw; in 2026.6.x its only caller is the compaction
  transcript rebuild, so on an interactive main-agent run the hook never fired and Engine A
  produced zero compression / zero tee / zero ledger.
- **Primary path is now `agentToolResultMiddleware`** — the runtime-neutral seam that runs live
  on every tool result in the normal agent loop. Registered via
  `api.registerAgentToolResultMiddleware(handler, { runtimes: ["openclaw", "codex"] })`, declared
  in the manifest as `contracts.agentToolResultMiddleware`. Receives the `AgentToolResult`
  (`{ content, details, … }`) and returns a rewritten one.
- **`tool_result_persist` kept as a secondary net** — strictly additive / backward-compatible; it
  still fires on older builds and at compaction-rebuild time. The compression logic is shared
  between both paths.
- **Idempotency guard** — output already carrying a `[full output: …]` pointer is never
  re-compressed (prevents double-processing when both paths see the same result).
- Grounded against openclaw@2026.6.6 middleware + hook types.

## 0.3.0 (2026-06-25)
- **Retention / auto-cleanup** — on load, prune `tee/` outputs and `.compaction/` snapshots older
  than `retentionDays` (default 14; `0` = keep forever). `audit.log` and the `stats.jsonl` ledger are
  never pruned. Best-effort; closes the "no auto-cleanup yet" gap from v0.1.0–0.2.0.

## 0.2.0 (2026-06-25)
- **Savings ledger** — Engine A now appends one line per compression to
  `memory/cache/stats.jsonl` (`at, tool, kind, linesIn/Out, charsIn/Out`). Best-effort and
  wrapped in its own try/catch, so a ledger write can never affect the tool result.
- **`scripts/report.mjs`** — prints a savings report (today + all-time): lines/tokens saved,
  breakdown by output kind, top tools, and pre-compaction snapshot counts. Pure Node, no deps.
  `node scripts/report.mjs [--brief] [--rate <usd/Mtok>] [--workspace <dir>]` (also `npm run report`).
- Token figures are explicit **estimates** (`chars ÷ 4`), never billed counts — receipts, not claims.

## 0.1.0 (2026-06-11)
- Initial typed-plugin (v2) build of smart-cache.
- **Engine A** — `tool_result_persist` (SYNC) auto-compresses verbose tool output. RTK-style
  filters (gitdiff / log / grep / tree / generic) ported from v1 `compress.sh` → JS, with the
  tee safety-net and safe-fail invariant preserved.
- **Engine B** — `before_compaction` writes a deterministic snapshot of the pre-compaction
  messages; `after_compaction` records the reclaim (audit trail makes silent loss visible).
- Compressor unit-tested (`node test/compress.test.mjs`).
- ✅ Validated on a live OpenClaw 2026.5.28: Gate-1 (loads, 3 hooks register) + Gate-2 (a real
  150-line `seq` tool output auto-compressed, full output tee'd). Subagent coverage gap: openclaw#60209.
