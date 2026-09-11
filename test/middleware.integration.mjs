// Integration check for the live agentToolResultMiddleware path (fix #1).
// Loads index.js with a mocked SDK, captures the registered middleware, fires realistic events.
import { readFileSync, existsSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const DIR = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const WS = mkdtempSync(join(tmpdir(), "scp-it-"));
const CACHE = join(WS, "memory", "cache");
process.env.OPENCLAW_WORKSPACE = WS;

let src = readFileSync(join(DIR, "index.js"), "utf8");
if (!process.env.OPENCLAW_SDK_REAL) src = src.replace('import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";', "const definePluginEntry = (x) => x;");
src = src.replace(/from "\.\/src\/compress\.js"/, `from "${pathToFileURL(join(DIR, "src/compress.js")).href}"`);
src = src.replace(/from "\.\/src\/tee\.js"/, `from "${pathToFileURL(join(DIR, "src/tee.js")).href}"`);
const mod = process.env.OPENCLAW_SDK_REAL ? await import(pathToFileURL(join(DIR,"index.js")).href) : await import(`data:text/javascript,${encodeURIComponent(src)}`);
const entry = mod.default;

let mw = null, mwOpts = null, persist = null;
const api = {
  pluginConfig: { workspaceByAgent: { "any-agent": WS } },
  config: { workspaceDir: WS },
  logger: { info() {}, warn(m) { console.log("WARN", m); } },
  registerAgentToolResultMiddleware: (fn, opts) => { mw = fn; mwOpts = opts; },
  on: (n, fn) => { if (n === "tool_result_persist") persist = fn; },
};
entry.register(api);

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (console.log("\u2713", n), pass++) : (console.log("\u2717", n), fail++); };

ok("middleware registered", typeof mw === "function");
ok("runtimes openclaw+codex", JSON.stringify(mwOpts) === '{"runtimes":["openclaw","codex"]}');
ok("persist fallback registered", typeof persist === "function");

const teeDir = join(CACHE, "tee");
const before = existsSync(teeDir) ? readdirSync(teeDir).length : 0;

const bigText = "diff --git a/x b/x\nindex 1..2 100644\n@@ -1,3 +1,3 @@\n a\n-old\n+new\n b\n" +
  Array.from({ length: 50 }, (_, i) => ` ctx${i}`).join("\n");
const ev = { toolCallId: "t1", toolName: "exec", args: {}, result: { content: [{ type: "text", text: bigText }], details: { x: 1 } } };

const r = mw(ev, { agentId: "any-agent", runtime: "openclaw" });
ok("result rewritten", !!r?.result);
const txt = r?.result?.content?.[0]?.text || "";
ok("kept +/- change", txt.includes("-old") && txt.includes("+new"));
ok("dropped context lines", !txt.includes("ctx40"));
ok("tee pointer present", txt.includes("[full output:"));
ok("details preserved", r.result.details && r.result.details.x === 1);
ok("image-only skipped", mw({ toolName: "x", result: { content: [{ type: "image", url: "z" }] } }, {}) === undefined);
ok("small skipped", mw({ toolName: "x", result: { content: [{ type: "text", text: "a\nb" }] } }, {}) === undefined);
const already = "x\n".repeat(50) + "[full output: /z]";
ok("idempotent skip", mw({ toolName: "x", result: { content: [{ type: "text", text: already }] } }, {}) === undefined);
ok("denyTools honored via persist path too", persist({ message: { content: "repeated fixture content for compression\n".repeat(100) } }, { toolName: "exec", agentId: "any-agent" }) !== undefined);

const after = existsSync(teeDir) ? readdirSync(teeDir).length : 0;
ok("tee file written", after > before);
const rows = existsSync(join(CACHE, "stats.jsonl"))
  ? readFileSync(join(CACHE, "stats.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
ok("ledger row w/ tool+kind", rows.some((x) => x.tool === "exec" && x.kind === "gitdiff"));

rmSync(WS, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
