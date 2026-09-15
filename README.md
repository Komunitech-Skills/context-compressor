# smart-cache-pro

Preserve complete verbose tool output in the owning workspace before returning a shorter representation to the model. Structured, research and handoff results remain intact by default.

Navigation: [When to use it](#when-to-use-it) · [See the expected result](#see-the-expected-result) · [Quick start on synthetic data](#quick-start-on-synthetic-data) · [Using it from OpenClaw](#using-it-from-openclaw) · [Input, output and completion](#input-output-and-completion) · [Commands and configuration](#commands-and-configuration) · [Data and effects](#data-and-effects) · [Get the private repository](#get-the-private-repository) · [Compatibility](#compatibility) · [Install and verify](#install-and-verify) · [Validation](#validation) · [Output scope](#output-scope) · [Troubleshooting](#troubleshooting) · [Related products and further reading](#related-products-and-further-reading)

## When to use it

Reduce bulky shell/process output while retaining the complete artifact. This is an OpenClaw plugin, not a conversational skill.

## See the expected result

Example request: **“Run a synthetic verbose shell tool in the isolated plugin-enabled instance, then verify the saved full output.”**

Expected behavior: A shortened shell result includes a full-output reference; the file retains the original. Structured and research/handoff results remain unchanged. This is an illustrative acceptance scenario, not a captured production conversation.

## Quick start on synthetic data

After obtaining a reviewed checkout using [private access](#get-the-private-repository), run:

```bash
bash examples/quickstart.sh
```

The script creates a private temporary workspace, prints its artifact directory and checks the result. Read [the example](examples/quickstart.sh) before running it. It keeps the synthetic artifacts for inspection; remove only the printed example directory when finished. It does not target your existing workspace or enable production services.

**What this example proves:** Real plugin code under synthetic hook contexts; this fixture run does not install or activate a live OpenClaw plugin.

Success ends with `Quickstart passed: smart-cache-pro`; an unexpected result exits nonzero. Some examples deliberately provoke a failure and verify it is rejected. Run installation and the relevant functional probe below for your own selected instance.

## Using it from OpenClaw

This repository is a plugin. Install it into the explicitly selected OpenClaw test instance and configure its entry as shown below; no SKILL.md discovery or slash command is implied.

## Input, output and completion

Input: supported tool result with resolved agent/run/session scope. Output: original result or a compact result plus private full-output file. Unknown scope or failed writes preserve the original. Character reduction is not measured token/billing savings.

Typical workflow: select the intended input/workspace → inspect prerequisites → run the matching operation → inspect its real result and artifact → report success, missing evidence or failure. A shortened shell result includes a full-output reference; the file retains the original. Structured and research/handoff results remain unchanged.

## Commands and configuration

Plugin entry: plugins.entries.smart-cache-pro. workspaceByAgent is an explicit allowlist; allowTools defaults to exec/process/bash/exec_command, denyTools wins. Empty allowTools disables compression. See installation/configuration below.

## Data and effects

Plugin reads allowed tool results and writes scoped output files, bounded ledger and retention state. It requires conversation access permission. Restart only the selected test Gateway after plugin code changes. Keep credentials out of example commands and reports. Use synthetic data for verification; preserve owner data during code maintenance.

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

Release evidence covers OpenClaw 2026.9.3. Node 22.13+ for package code; SDK integration tests use Node 24. Actual hooks require compatible OpenClaw. Bash runs the test entrypoint. Revalidate changed SDK/native contracts before using another OpenClaw version.

## Install and verify

For a reviewed local plugin source, `--force` acknowledges the source and `--accept-capabilities` records consent to its declared capabilities. Without the latter the CLI can reject activation even after copying files. Read the plugin manifest and scope its workspace/tool access before accepting. Review the exact checkout first; use the explicitly selected isolated instance. The flag can also replace an existing installation, so retain its previous code/configuration before using it for an update.

Select an existing workspace explicitly; do not point a test at production. Review and check out the intended full commit before running its installer.

```bash
WS=/absolute/agent/workspace
node test/compress.test.mjs
node test/middleware.integration.mjs
node test/failure-isolation.mjs
```

Install the reviewed checkout:

```bash
openclaw plugins install /absolute/checkout --force --accept-capabilities
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

For an update, retain the current reviewed checkout/config and output data, check out the new full commit, run `bash test.sh`, then install that checkout with `openclaw plugins install /absolute/checkout --force --accept-capabilities`. Preserve the approved mapping, restart the selected Gateway and repeat acceptance. If it fails, reinstall the saved previous checkout with `--force`, restore only the matching plugin entry, restart and verify. Do not erase output artifacts during code rollback. Disable the plugin entry before uninstalling; retention controls cache data. Character compression is not a measured token/billing saving.

## Validation

```bash
bash test.sh
```

This entrypoint runs provider-free tests in temporary workspaces with a clean HOME and no inherited service credentials. Exit 0 means the listed tests passed; optional native tests print SKIPPED when dependencies are absent. It does not prove live model quality, delivery, or production readiness. See [VERIFICATION.md](VERIFICATION.md) for functional acceptance criteria, expected results and failure handling. CI runs this same entrypoint on Python 3.11 and Node 24. Recheck real SDK/native/model integration separately when changing those components.


## Output scope

`allowTools` defaults to `["exec", "process", "bash", "exec_command"]`; an empty array disables output compression while retaining compaction snapshots. `denyTools` takes precedence. Keep research, browser, memory and agent/session tools outside the allowlist: a full-output pointer does not replace lossless evidence or a complete handoff. This plugin cannot remove native tool display caps; workers should save full reports and return a concise summary plus the artifact path. Verify with `node test/research-preservation.mjs`.

## Troubleshooting

No compression → inspect scope mapping, tool allow/deny lists, structured output and write failures. Old behavior after update → restart the matching Gateway and verify a new result. Missing full output → preserve the original and investigate storage.

Private clone returns 404 → check the authenticated account and repository read permission on this machine → repeat checkout. Installation rejected → inspect the reported workspace/ownership/drift conflict → resolve that exact cause and rerun status. A successful install receipt alone is not functional evidence; repeat the acceptance probe after recovery.

## Related products and further reading

[cs-agent-pro](https://github.com/rin-proxy/cs-agent-pro) · [self-monitoring](https://github.com/rin-proxy/self-monitoring). The [runbook catalog](https://github.com/rin-proxy/rin-runbook/blob/main/CATALOG.md) identifies active sources and presets. skill-curator is archived; new skill-management installs use skill-forge.

[Acceptance and recovery](VERIFICATION.md) · [Changelog](CHANGELOG.md) · [Commercial license](LICENSE-COMMERCIAL.md). Follow the repository's actual license/metadata and owner-granted access; this guide introduces no new license or redistribution grant. Detailed agent procedures stay in their existing reference files so discovery instructions remain concise.

## Release and maintenance checks

See [release notes](RELEASE-NOTES.md) and [tested compatibility](COMPATIBILITY.md).
Run `python3 scripts/check-docs.py` to validate local documentation links and declared interfaces;
CI also runs the synthetic quickstart. Private GitHub access is required to download releases.
