# smart-cache-pro

Compress verbose tool output only after preserving the complete result in the owning workspace. Only shell/process tools are compression candidates by default; research results, agent handoffs and unknown tools remain intact. Valid JSON and results with structuredContent are also preserved. Unknown scope or write failure preserves the original. Agent/run/session isolation, private output files, bounded ledger and activity-driven retention are included.

## Get the private repository

Use an account or GitHub App with **read access** to this repository. Configure authentication on the machine running OpenClaw; a successful login on another machine does not transfer access. For an existing GitHub CLI login:

```bash
gh auth status
gh auth setup-git
gh repo clone rin-proxy/smart-cache-pro
cd smart-cache-pro
git fetch origin main
# Set REF to the reviewed full commit from the release manifest or PR.
REF=FULL_40_CHARACTER_COMMIT
git checkout --detach "$REF"
```

The placeholder must be replaced before execution. Do not paste tokens into clone URLs, agent prompts, config examples or logs. HTTPS updates below use the configured Git credential helper. A 404 on a private repo can mean missing access: check the account and repository permission first. Run installer commands from this checkout; `WS` always selects the target agent workspace explicitly.

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

Install the reviewed checkout:

```bash
openclaw plugins install /absolute/checkout
```

Apply the following plugin entry to the **selected OpenClaw instance**, replacing the sample agent/workspace. Preserve unrelated settings; do not replace the entire configuration file.

```json
{
  "enabled": true,
  "hooks": {"allowConversationAccess": true},
  "config": {
    "workspaceByAgent": {"audit-agent": "/absolute/audit/workspace"},
    "allowTools": ["exec", "process", "bash", "exec_command"],
    "retentionDays": 14,
    "maxLedgerBytes": 1048576
  }
}
```

This is the value of `plugins.entries.smart-cache-pro`. `workspaceByAgent` is a strict allowlist: an empty mapping disables all agents, unlisted agents are skipped, and omitting it enables automatic scope discovery. The supported `before_model_resolve` hook associates run/session context with the workspace. Keep research/browser/memory/agent handoff tools outside the compression allowlist.

Restart the selected Gateway process after installing or updating plugin JavaScript. Config hot reload can retain the previous module in memory. Record the deployed source hash and verify a new synthetic tool result after restart: a long diff should include a full-output pointer; the file should preserve the complete original; valid JSON and research/handoff results should be unchanged. Inspect hook warnings. This does not require sending a Telegram message.

For an update, retain the current reviewed checkout/config and output data, check out the new full commit, run `bash test.sh`, then install that checkout with `openclaw plugins install /absolute/checkout --force`. Preserve the approved mapping, restart the selected Gateway and repeat acceptance. If it fails, reinstall the saved previous checkout with `--force`, restore only the matching plugin entry, restart and verify. Do not erase output artifacts during code rollback. Disable the plugin entry before uninstalling; retention controls cache data. Character compression is not a measured token/billing saving.

## Validation

```bash
bash test.sh
```

This entrypoint runs provider-free tests in temporary workspaces with a clean HOME and no inherited service credentials. Exit 0 means the listed tests passed; optional native tests print SKIPPED when dependencies are absent. It does not prove live model quality, delivery, or production readiness. See [VERIFICATION.md](VERIFICATION.md) for functional acceptance criteria, expected results and failure handling. CI runs this same entrypoint on Python 3.11 and Node 24. Recheck real SDK/native/model integration separately when changing those components.


## Output scope

`allowTools` defaults to `["exec", "process", "bash", "exec_command"]`; an empty array disables output compression while retaining compaction snapshots. `denyTools` takes precedence. Keep research, browser, memory and agent/session tools outside the allowlist: a full-output pointer does not replace lossless evidence or a complete handoff. This plugin cannot remove native tool display caps; workers should save full reports and return a concise summary plus the artifact path. Verify with `node test/research-preservation.mjs`.
