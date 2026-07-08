// smart-cache-pro — the typed-plugin (v2) of smart-cache.
// Engine A: AUTO-compress verbose tool output. PRIMARY path is the runtime-neutral
//   `agentToolResultMiddleware` (fires LIVE on every tool result); the legacy
//   `tool_result_persist` hook is kept as a secondary net (see the note below).
// Engine B: deterministic pre-compaction snapshot via `before_compaction` — no agent discipline needed.
// Grounded against openclaw@2026.6.6 hook + middleware types. Defensive: any error leaves the original untouched.
//
// WHY THE MIDDLEWARE (fixes #1 — inert on 2026.6.6):
//   `tool_result_persist` is NOT a live tool-output interceptor on modern OpenClaw. In 2026.6.x
//   its only caller is the compaction transcript rebuild — so on an interactive main-agent run it
//   never fires, and Engine A produced zero compression / zero tee / zero ledger (issue #1).
//   `api.registerAgentToolResultMiddleware(handler, { runtimes })` is the supported seam that runs
//   live on every tool result in the normal agent loop: it receives the AgentToolResult
//   ({ content: (TextContent|ImageContent)[], details, ... }) and returns a rewritten one.
//   We register that as the primary path and KEEP the old hook as a harmless secondary net (it still
//   fires at compaction-rebuild time on builds/paths where it's wired), so this is strictly additive
//   and backward-compatible. Manifest must declare `contracts.agentToolResultMiddleware`.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { mkdirSync, writeFileSync, appendFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { compress, detectKind, lineCount } from "./src/compress.js";
import { teeFullSync } from "./src/tee.js";

// v0.3.0 — retention: remove files older than `days` from `dir` (skip names in `keep`). Best-effort.
function pruneOld(dir, days, keep = []) {
  if (!days || days <= 0) return 0;
  let removed = 0;
  try {
    const cutoff = Date.now() - days * 86400000;
    for (const f of readdirSync(dir)) {
      if (keep.includes(f)) continue;
      try { if (statSync(join(dir, f)).mtimeMs < cutoff) { unlinkSync(join(dir, f)); removed++; } } catch {}
    }
  } catch { /* dir may not exist yet */ }
  return removed;
}

export default definePluginEntry({
  id: "smart-cache-pro",
  name: "Smart Cache Pro",
  description:
    "Automatic RTK-style compression of verbose tool output (live agentToolResultMiddleware, with a tool_result_persist fallback) + deterministic pre-compaction snapshot (before_compaction). The enforced, no-agent-discipline-needed version of smart-cache.",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    if (cfg.enabled === false) {
      api.logger?.info?.("smart-cache-pro disabled via config");
      return;
    }
    const minLines = Number.isInteger(cfg.minLines) ? cfg.minLines : 40;
    const denyTools = new Set(Array.isArray(cfg.denyTools) ? cfg.denyTools : []);
    const ws =
      process.env.OPENCLAW_WORKSPACE ||
      api.config?.workspaceDir ||
      join(homedir(), ".openclaw", "workspace");
    const cacheDir = join(ws, "memory", "cache");
    const teeDir = cfg.teeDir || join(cacheDir, "tee");
    const compDir = join(cacheDir, ".compaction");
    const statsFile = join(cacheDir, "stats.jsonl");          // v0.2.0 — savings ledger (one line / compression)
    const log = api.logger;

    // ── v0.3.0 — retention: prune old tee files + compaction snapshots on load (best-effort). ──
    const retentionDays = Number.isInteger(cfg.retentionDays) ? cfg.retentionDays : 14;
    if (retentionDays > 0) {
      const pruned = pruneOld(teeDir, retentionDays) + pruneOld(compDir, retentionDays, ["audit.log"]);
      if (pruned) log?.info?.(`smart-cache-pro pruned ${pruned} old cache file(s) (>${retentionDays}d)`);
    }

    // ── Shared compressor. Given the plain text of a tool result, tee + compress + ledger.
    //    Returns the replacement text (with the [full output: …] pointer) or null to leave the
    //    original untouched. Used by BOTH the live middleware and the legacy persist hook. SYNC. ──
    function compressToolResultText(text, toolName) {
      if (denyTools.has(toolName)) return null;
      if (typeof text !== "string") return null;
      if (lineCount(text) < minLines) return null;           // leave small results alone
      if (text.includes("[full output:")) return null;        // idempotent: never re-compress our own output
      const teePath = teeFullSync(text, teeDir);              // save FULL output first (nothing lost)
      const kind = detectKind(text);
      const out = compress(text, kind, { maxLines: minLines });
      if (!out) return null;                                  // compression wouldn't help → untouched
      try {                                                   // v0.2.0 — savings ledger (best-effort; never affects the result)
        mkdirSync(cacheDir, { recursive: true });
        appendFileSync(statsFile, JSON.stringify({
          at: new Date().toISOString(),
          tool: toolName ?? "?",
          kind,
          linesIn: lineCount(text), linesOut: lineCount(out),
          charsIn: text.length, charsOut: out.length,
        }) + "\n");
      } catch { /* stats are best-effort — never let a ledger write affect the tool result */ }
      return out + (teePath ? `\n[full output: ${teePath}]` : "");
    }

    // Rewrite the first text block of an AgentToolResult-style content array in place.
    // Returns a new content array, or null if nothing changed.
    function rewriteContentBlocks(content, toolName) {
      if (!Array.isArray(content)) return null;
      const i = content.findIndex((b) => b?.type === "text" && typeof b.text === "string");
      if (i < 0) return null;
      const out = compressToolResultText(content[i].text, toolName);
      if (out == null) return null;
      const next = content.slice();
      next[i] = { ...content[i], type: "text", text: out };
      return next;
    }

    // ── Engine A (PRIMARY) — live agentToolResultMiddleware. Fires on every tool result in the
    //    normal agent loop. event.result is an AgentToolResult { content, details, ... }. ──
    if (typeof api.registerAgentToolResultMiddleware === "function") {
      api.registerAgentToolResultMiddleware((event, ctx) => {
        try {
          const toolName = event?.toolName;
          const result = event?.result;
          const nextContent = rewriteContentBlocks(result?.content, toolName);
          if (!nextContent) return;                           // nothing to change → leave original
          return { result: { ...result, content: nextContent } };
        } catch (err) {
          log?.warn?.(`[smart-cache-pro] middleware failed (left original): ${String(err)}`);
          return; // never break a tool call
        }
      }, { runtimes: ["openclaw", "codex"] });
      log?.info?.("smart-cache-pro — live agentToolResultMiddleware registered (runtimes: openclaw, codex)");
    } else {
      log?.warn?.("smart-cache-pro: registerAgentToolResultMiddleware unavailable on this build — falling back to tool_result_persist only");
    }

    // ── Engine A (SECONDARY / legacy net) — tool_result_persist. SYNC: no async/await here.
    //    On modern OpenClaw this fires at compaction-transcript rebuild, not live; harmless to keep
    //    and still useful on older builds / paths where it IS the live persist point. ──
    api.on("tool_result_persist", (event, ctx) => {
      try {
        const toolName = ctx?.toolName ?? event?.toolName;
        const msg = event?.message;
        const content = msg?.content;
        if (Array.isArray(content)) {
          const next = rewriteContentBlocks(content, toolName);
          if (!next) return;
          return { message: { ...msg, content: next } };       // ← replaces the persisted tool result
        } else if (typeof content === "string") {
          const out = compressToolResultText(content, toolName);
          if (out == null) return;
          return { message: { ...msg, content: out } };
        }
      } catch (err) {
        log?.warn?.(`[smart-cache-pro] tool_result_persist failed (left original): ${String(err)}`);
        return; // never break a tool call
      }
    });

    // ── Engine B — deterministic snapshot the instant the session is about to compact. ──
    // Unlike the v1 file-hook (metadata only), this typed hook receives event.messages, so we
    // can persist them ourselves — nothing depends on the agent remembering to flush.
    api.on("before_compaction", (event) => {
      try {
        mkdirSync(compDir, { recursive: true });
        const at = new Date().toISOString();
        if (Array.isArray(event?.messages) && event.messages.length) {
          const file = join(compDir, `snapshot-${at.replace(/[:.]/g, "-")}.json`);
          writeFileSync(
            file,
            JSON.stringify({ at, messageCount: event.messageCount, messages: event.messages }, null, 2),
          );
        }
        appendFileSync(
          join(compDir, "audit.log"),
          `${at} before_compaction messageCount=${event?.messageCount ?? "?"} tokenCount=${event?.tokenCount ?? "?"} snapshot=saved\n`,
        );
      } catch (err) {
        log?.warn?.(`[smart-cache-pro] before_compaction snapshot failed: ${String(err)}`);
      }
    });

    // ── Audit how much each compaction actually reclaimed (makes silent loss visible). ──
    api.on("after_compaction", (event) => {
      try {
        mkdirSync(compDir, { recursive: true });
        appendFileSync(
          join(compDir, "audit.log"),
          `${new Date().toISOString()} after_compaction compactedCount=${event?.compactedCount ?? "?"} tokenCount=${event?.tokenCount ?? "?"}\n`,
        );
      } catch { /* best-effort */ }
    });

    log?.info?.("smart-cache-pro active — auto-compress (agentToolResultMiddleware + tool_result_persist fallback) + pre-compaction snapshot");
  },
});
