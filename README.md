# smart-cache-pro

Compress verbose tool output only after preserving the complete result in the owning workspace. Only shell/process tools are compression candidates by default; research results, agent handoffs and unknown tools remain intact. Valid JSON and results with structuredContent are also preserved. Unknown scope or write failure preserves the original. Agent/run/session isolation, private output files, bounded ledger and activity-driven retention are included.

## Compatibility

Validated against OpenClaw 2026.9.3. Linux, Bash, Git and Python 3.11+ are required for the operational lifecycle. JavaScript components require Node 22.13+; the runtime SDK tests use Node 24. Revalidate SDK contracts before upgrading OpenClaw.

## Install and verify

Select an existing workspace explicitly; do not point a test at production. Review and check out the intended full commit before running its installer.

```bash
WS=/absolute/agent/workspace
node test/compress.test.mjs
node test/middleware.integration.mjs
node test/failure-isolation.mjs
```

Install the reviewed plugin checkout with `openclaw plugins install /absolute/checkout`. Configure `plugins.entries.smart-cache-pro.config.workspaceByAgent` with absolute paths for each intended agent. Set `plugins.entries.smart-cache-pro.hooks.allowConversationAccess=true` to permit the workspace-resolution hook; scope the plugin with `workspaceByAgent`. When provided, this mapping is a strict agent allowlist: unlisted agents are skipped even when the Gateway supplies their workspace. An empty mapping disables processing for every agent. Omit the mapping only when automatic discovery for all agents is intended. The supported `before_model_resolve` hook learns run/session workspace context. Reload the Gateway; check for hook warnings and inspect an actual compressed tool result plus its full-output file. Disable the plugin entry before uninstalling; keep cache data until retention expires. A plugin marked loaded alone does not prove compression.

## Validation

Run the repository tests against synthetic fixtures; inspect commands before using live credentials. Python tests: `python3 -m unittest discover -s tests -p "test_*.py"` where present. JavaScript tests are in `test/`, `tests/`, or `_semantic-stack/test-*.mjs`. Include install → reinstall → pinned update → rollback → uninstall, owner-data preservation, failure paths and a real OpenClaw integration test. No service or scheduler is enabled by the common skill installer.

The detailed agent procedure remains in `SKILL.md` where present. The compatibility and lifecycle instructions in this README describe the current implementation.

## Output scope

`allowTools` defaults to `["exec", "process", "bash", "exec_command"]`; an empty array disables output compression while retaining compaction snapshots. `denyTools` takes precedence. Keep research, browser, memory and agent/session tools outside the allowlist: a full-output pointer does not replace lossless evidence or a complete handoff. This plugin cannot remove native tool display caps; workers should save full reports and return a concise summary plus the artifact path. Verify with `node test/research-preservation.mjs`.
