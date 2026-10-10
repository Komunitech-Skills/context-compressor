// Compression requires a preserved full result in the owning agent workspace.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { mkdirSync, writeFileSync, appendFileSync, readdirSync, statSync, lstatSync, unlinkSync, renameSync, existsSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { compress, detectKind, lineCount } from "./src/compress.js";
import { teeFullSync } from "./src/tee.js";

export default definePluginEntry({
  id: "context-compressor", name: "Context Compressor",
  description: "Preserved tool output compression with per-agent storage and bounded retention.",
  register(api) {
    const cfg = api.pluginConfig ?? {};
    if (cfg.enabled === false) return;
    const minLines = Math.max(2, Number.isInteger(cfg.minLines) ? cfg.minLines : 40);
    // Research, session handoffs and unknown tools must remain lossless. Shell
    // tools are opt-in candidates; even those can return structured data.
    const allowTools = new Set(cfg.allowTools ?? ["exec", "process", "bash", "exec_command"]);
    const denyTools = new Set(cfg.denyTools ?? []);
    const retentionDays = cfg.retentionDays ?? 14;
    const maxLedgerBytes = cfg.maxLedgerBytes ?? 1024 * 1024;
    const scopedAgents = cfg.workspaceByAgent == null ? null : new Set(Object.keys(cfg.workspaceByAgent));
    const workspaces = new Map(Object.entries(cfg.workspaceByAgent ?? {}));
    for (const agent of api.config?.agents?.list ?? []) {
      if (!scopedAgents && agent.id && agent.workspace) workspaces.set(agent.id, agent.workspace);
    }
    const defaultWorkspace = api.config?.agents?.defaults?.workspace || process.env.OPENCLAW_WORKSPACE;
    if (!scopedAgents && defaultWorkspace && !workspaces.has("main")) workspaces.set("main", defaultWorkspace);
    const maintenance = new Map(), warned = new Set();
    const warnOnce = (key, message) => { if (!warned.has(key)) { warned.add(key); api.logger?.warn?.(message); } };
    function agentId(ctx) { return ctx?.agentId || /^agent:([^:]+):/.exec(ctx?.sessionKey || "")?.[1]; }
    const scopedWorkspaces = new Map();
    const scopeKeys = ctx => [ctx?.runId && `run:${agentId(ctx)}:${ctx.runId}`, ctx?.sessionKey && `session:${ctx.sessionKey}`].filter(Boolean);
    function remember(_event, ctx) {
      const id = agentId(ctx);
      if (id && (!scopedAgents || scopedAgents.has(id)) && ctx?.workspaceDir && isAbsolute(ctx.workspaceDir)) {
        for (const key of scopeKeys(ctx)) scopedWorkspaces.set(key, ctx.workspaceDir);
        while (scopedWorkspaces.size > 4096) scopedWorkspaces.delete(scopedWorkspaces.keys().next().value);
      }
    }
    // Middleware context has identity but no workspace in 2026.9.6. Capture the
    // trusted run context before tools execute, or use an explicit workspace map.
    api.on("before_model_resolve", remember);
    function paths(ctx) {
      const id = agentId(ctx);
      if (scopedAgents && !scopedAgents.has(id)) return null;
      remember(null, ctx);
      const value = ctx?.workspaceDir || scopeKeys(ctx).map(key => scopedWorkspaces.get(key)).find(Boolean) || (id && workspaces.get(id));
      if (!value || !isAbsolute(value)) {
        warnOnce(`scope:${id}`, "context-compressor: workspace unresolved; original output retained");
        return null;
      }
      const ws = resolve(value), cache = join(ws, "memory", "cache");
      const tee = cfg.teeDir ? resolve(ws, cfg.teeDir.replaceAll("{agentId}", id)) : join(cache, "tee");
      const rel = relative(ws, tee);
      if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("teeDir must remain inside the agent workspace");
      for (const dir of [join(ws,"memory"), cache, tee, join(cache,"compaction")]) {
        let current = dir;
        while (current !== ws && current.startsWith(ws + "/")) {
          if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("cache path is a symlink");
          current = resolve(current, "..");
        }
      }
      return { id, ws, cache, tee, comp:join(cache,"compaction"), stats:join(cache,"stats.jsonl") };
    }
    function maintain(p) {
      const now = Date.now();
      if (now - (maintenance.get(p.ws) || 0) < 60_000) return;
      maintenance.set(p.ws,now);
      if (retentionDays > 0) for (const dir of [p.tee,p.comp]) {
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir)) {
          if (!/^(out-.*\.log|snapshot-.*\.json)$/.test(name)) continue;
          const file = join(dir,name), st = lstatSync(file);
          if (st.isFile() && st.mtimeMs < now-retentionDays*86400000) unlinkSync(file);
        }
      }
    }
    function record(p, row) {
      try {
        mkdirSync(p.cache,{recursive:true,mode:0o700});
        if (existsSync(p.stats) && lstatSync(p.stats).isSymbolicLink()) return;
        if (existsSync(p.stats) && statSync(p.stats).size >= maxLedgerBytes) renameSync(p.stats,p.stats+".1");
        appendFileSync(p.stats,JSON.stringify({at:new Date().toISOString(),agentId:p.id,...row})+"\n",{mode:0o600});
      } catch { /* telemetry failure never changes the tool result */ }
    }
    function compressText(text, toolName, ctx, transport = "plain") {
      if (!allowTools.has(toolName) || denyTools.has(toolName) || typeof text !== "string" || lineCount(text)<minLines || text.includes("[full output:")) return null;
      try { JSON.parse(text); return null; } catch { /* Plain text may be compressed. */ }
      const start = performance.now(), kind = detectKind(text), out = compress(text,kind,{maxLines:minLines});
      if (!out) return null;
      const p = paths(ctx);
      if (!p) return null;
      try { maintain(p); } catch { /* retention cannot discard the current output */ }
      const teePath = teeFullSync(text,p.tee);
      if (!teePath) {
        warnOnce(`write:${p.id}`,"context-compressor: full output save failed; original output retained");
        return null;
      }
      const replacement = out + `\n[full output: ${teePath}]`;
      if (replacement.length >= text.length) return null;
      record(p,{tool:toolName??"?",transport,kind,linesIn:lineCount(text),linesOut:lineCount(replacement),charsIn:text.length,
        charsOut:replacement.length,savedChars:text.length-replacement.length,elapsedMs:performance.now()-start});
      return replacement;
    }
    // Code Mode serializes an exec result as a one-line JSON transport envelope.
    // Recognize only that narrow runtime-owned shape, then compress its stdout
    // field while leaving arbitrary JSON from commands lossless.
    function rewriteCodeModeEnvelope(text, tool, ctx) {
      if (typeof text !== "string" || !text.startsWith("{") || !allowTools.has(tool) || denyTools.has(tool)) return null;
      let envelope;
      try { envelope = JSON.parse(text); } catch { return null; }
      const value = envelope?.value;
      const isEnvelope = envelope && !Array.isArray(envelope)
        && Array.isArray(envelope.output)
        && typeof envelope.replaySafe === "boolean"
        && envelope.telemetry && typeof envelope.telemetry === "object" && !Array.isArray(envelope.telemetry)
        && value && typeof value === "object" && !Array.isArray(value)
        && typeof value.status === "string" && envelope.status === value.status
        && typeof value.aggregated === "string"
        && Object.prototype.hasOwnProperty.call(value,"exitCode");
      if (!isEnvelope) return null;
      const aggregated = compressText(value.aggregated,tool,ctx,"code-mode-envelope");
      if (aggregated == null) return null;
      const rewritten = JSON.stringify({...envelope,value:{...value,aggregated}});
      return rewritten.length < text.length ? rewritten : null;
    }
    function rewriteText(text, tool, ctx) {
      return compressText(text,tool,ctx) ?? rewriteCodeModeEnvelope(text,tool,ctx);
    }
    function rewrite(content, tool, ctx) {
      if (typeof content === "string") return rewriteText(content,tool,ctx);
      if (!Array.isArray(content)) return null;
      let changed = false;
      const next = content.map(block => {
        if (block?.type !== "text") return block;
        const text = rewriteText(block.text,tool,ctx);
        if (text == null) return block;
        changed = true; return {...block,text};
      });
      return changed ? next : null;
    }
    if (typeof api.registerAgentToolResultMiddleware === "function") {
      api.registerAgentToolResultMiddleware((event,ctx) => {
        try {
          if (event?.result?.structuredContent != null) return;
          const content = rewrite(event?.result?.content,event?.toolName,ctx);
          if (content != null) return {result:{...event.result,content}};
        } catch { warnOnce("middleware-error","context-compressor: compression unavailable; original output retained"); }
      },{runtimes:["openclaw","codex"]});
    } else warnOnce("unsupported","context-compressor: live middleware unavailable; runtime compression is not active");
    api.on("tool_result_persist",(event,ctx) => {
      try {
        const content = rewrite(event?.message?.content,ctx?.toolName??event?.toolName,ctx);
        if (content != null) return {message:{...event.message,content}};
      } catch { /* preserve original */ }
    });
    api.on("before_compaction",(event,ctx) => {
      try {
        const p = paths(ctx); if (!p) return;
        if (!Array.isArray(event?.messages) || !event.messages.length) {record(p,{event:"compaction",snapshot:"unavailable"});return;}
        mkdirSync(p.comp,{recursive:true,mode:0o700}); maintain(p);
        writeFileSync(join(p.comp,`snapshot-${Date.now()}-${randomUUID()}.json`),JSON.stringify({at:new Date().toISOString(),agentId:p.id,messages:event.messages}),{mode:0o600,flag:"wx"});
        record(p,{event:"compaction",snapshot:"saved",messageCount:event.messages.length});
      } catch { warnOnce("snapshot-failed","context-compressor: compaction snapshot failed"); }
    });
    api.on("after_compaction",(event,ctx) => {
      try {const p=paths(ctx);if(p)record(p,{event:"after_compaction",tokensBefore:event?.tokensBefore??null,tokensAfter:event?.tokensAfter??null});} catch {}
    });
    api.logger?.info?.("context-compressor registered; verify an actual tool result to confirm operation");
  },
});
