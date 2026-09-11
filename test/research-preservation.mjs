import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const repo = new URL('../', import.meta.url).pathname;
let src = readFileSync(join(repo, 'index.js'), 'utf8');
src = src.replace('import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";', 'const definePluginEntry = x => x;');
for (const name of ['compress', 'tee']) src = src.replace(`from "./src/${name}.js"`, `from "${pathToFileURL(join(repo, 'src', name + '.js')).href}"`);
const { default: entry } = process.env.OPENCLAW_SDK_REAL
  ? await import(pathToFileURL(join(repo, 'index.js')).href)
  : await import(`data:text/javascript,${encodeURIComponent(src)}`);
const root = mkdtempSync(join(tmpdir(), 'cache-research-'));
const ctx = { agentId: 'main', sessionKey: 'agent:main:synthetic-research' };
let middleware, persist;
function register(config = {}) {
  entry.register({
    pluginConfig: { workspaceByAgent: { main: root }, ...config }, config: {},
    logger: { info() {}, warn() {} },
    registerAgentToolResultMiddleware(fn) { middleware = fn; },
    on(name, fn) { if (name === 'tool_result_persist') persist = fn; },
  });
}
const evidence = 'Warning: source access limitation\n' + Array.from({ length: 120 }, (_, i) =>
  `Finding ${i}: distinct source evidence https://example.invalid/source/${i}`).join('\n');
const handoff = JSON.stringify({ status: 'ok', findings: evidence.split('\n'), artifact: '/fixture/report.md' }, null, 2);
function event(toolName, text, extra = {}) {
  return { toolName, result: { content: [{ type: 'text', text }, { type: 'image', data: 'synthetic' }], details: { receipt: 'keep' }, ...extra } };
}
try {
  register();
  for (const tool of ['agents_wait', 'agents_spawn', 'sessions_history', 'sessions_send', 'sessions_yield', 'web_search', 'web_fetch', 'browser', 'read', 'memory_get', 'unknown_tool']) {
    for (const text of [evidence, handoff]) {
      const input = event(tool, text), before = JSON.stringify(input);
      assert.equal(middleware(input, ctx), undefined, tool + ' must stay lossless');
      assert.equal(persist({ toolName: tool, message: { content: input.result.content } }, ctx), undefined);
      assert.equal(JSON.stringify(input), before, 'input must not be mutated');
    }
  }
  assert(!existsSync(join(root, 'memory')), 'skipped evidence must not produce cache files');
  for (const tool of ['exec', 'process', 'bash', 'exec_command']) {
    assert.equal(middleware(event(tool, handoff), ctx), undefined, 'shell JSON must remain valid');
    assert.equal(persist({ message: { content: handoff } }, { ...ctx, toolName: tool }), undefined);
    assert.equal(middleware(event(tool, evidence, { structuredContent: { findings: ['keep'] } }), ctx), undefined);
  }
  const diff = 'diff --git a/x b/x\n@@ -1,2 +1,2 @@\n-old\n+new\n' + Array.from({ length: 120 }, (_, i) => ` context ${i}`).join('\n');
  const compressed = middleware(event('exec', diff), ctx);
  const text = compressed.result.content[0].text;
  assert(text.includes('-old') && text.includes('+new') && text.includes('[full output:'));
  const pointer = /\[full output: (.+)\]/.exec(text)[1];
  assert.equal(readFileSync(pointer, 'utf8'), diff);
  assert.equal(compressed.result.details.receipt, 'keep');
  assert.deepEqual(compressed.result.content[1], { type: 'image', data: 'synthetic' });
  register({ allowTools: [] });
  assert.equal(middleware(event('exec', diff), ctx), undefined);
  assert.equal(persist({ message: { content: diff } }, { ...ctx, toolName: 'exec' }), undefined);
  register({ allowTools: ['custom_log'], denyTools: ['custom_log'] });
  assert.equal(middleware(event('custom_log', diff), ctx), undefined);
  assert.equal(persist({ message: { content: diff } }, { ...ctx, toolName: 'custom_log' }), undefined);
  register({ allowTools: ['custom_log'] });
  assert(middleware(event('custom_log', diff), ctx)?.result);
  assert.equal(middleware(event('exec', diff), ctx), undefined);
  console.log('PASS: research and handoffs stay lossless in live/persist paths; JSON, structured results, allowlist, denylist and full-output retrieval verified');
} finally { rmSync(root, { recursive: true, force: true }); }
