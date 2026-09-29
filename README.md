# context-compressor

> **Product classification:** Plugin · Activation: Passive · Model discovery: Disabled

## Activation model

Passive OpenClaw plugin. It runs only after explicit plugin registration and stays out of skill discovery.

Preserve complete verbose tool output in the owning workspace before returning a shorter view to the
model. Structured, research and agent-handoff results remain intact by default.

## Use and expected result

Use this OpenClaw plugin for bulky shell/process output when the full artifact must remain available.
A shortened result should contain a full-output reference whose file preserves the original. Unknown
scope, failed writes, structured data, research output and handoffs pass through unchanged.

Example request: **“Run a verbose synthetic shell tool and verify the saved full output.”** The
expected result is a smaller model-facing payload plus a complete private artifact. Character
reduction is not a measured billing guarantee.

## Quick start

```bash
bash examples/quickstart.sh
```

The provider-free fixture exercises real hook logic without installing or activating a live plugin.
Success ends with `Quickstart passed: context-compressor`.

## Install and configure

Authenticate to this private repository and check out a reviewed full commit. Review the plugin
manifest and the selected instance before accepting its declared capabilities.

```bash
git clone https://github.com/rin-proxy/context-compressor.git
cd context-compressor
REF=FULL_40_CHARACTER_COMMIT
git checkout --detach "$REF"
bash test.sh
openclaw plugins install "$PWD" --force --accept-capabilities
```

Add the following value under `plugins.entries.context-compressor` in the selected instance. Preserve
unrelated configuration.

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

`workspaceByAgent` is an explicit allowlist; an empty mapping disables every agent. `allowTools`
defaults to shell/process tools, an empty list disables compression, and `denyTools` takes
precedence. Restart only the selected Gateway after JavaScript changes, then verify a new long result
and its full-output file.

## Upgrade from the previous plugin ID

After installing the new plugin package, migrate an isolated instance configuration. The first command is read-only; apply refuses configurations where both IDs are active.

```bash
python3 scripts/migrate-plugin-id.py plan --config /absolute/path/openclaw.json
python3 scripts/migrate-plugin-id.py apply --config /absolute/path/openclaw.json
python3 scripts/migrate-plugin-id.py rollback --config /absolute/path/openclaw.json
```

The migration preserves the complete old entry under `context-compressor`, leaves unrelated configuration unchanged, and can restore `smart-cache-pro` exactly. Restart only the selected Gateway after acceptance.

## Scope and safety

The plugin reads allowed tool results and writes scoped output files, a bounded ledger and retention
state. It needs conversation-access permission. Keep research, browser, memory and agent/session tools
outside `allowTools`; a pointer is not a substitute for lossless evidence or a complete handoff.

This plugin cannot remove native display caps. Workers should save complete reports and return a
summary plus the artifact path. Test preservation with:

```bash
node test/research-preservation.mjs
```

For updates, retain the reviewed previous checkout, configuration and output data; test the new full
commit, install it with the same capability acknowledgement, restart, and repeat acceptance. On
failure, reinstall the saved checkout and restore only the matching plugin entry. Disable the entry
before uninstalling; retention controls data removal.

Requirements and supported OpenClaw/Node versions are maintained in
[COMPATIBILITY.md](COMPATIBILITY.md). Keep credentials out of configuration examples and test only an
isolated instance before production activation.

## Verification and evidence

```bash
bash test.sh
python3 scripts/check-docs.py
```

The recorded synthetic comparison passed 30/30 strict cases in both arms and met its scoped
efficiency threshold. It does not guarantee savings for other tools, models or environments. See
[BENCHMARK.md](BENCHMARK.md) for the exact protocol and [VERIFICATION.md](VERIFICATION.md) for live
acceptance and recovery.

Further reading: [release notes](RELEASE-NOTES.md) · [changelog](CHANGELOG.md) ·
[commercial license](LICENSE-COMMERCIAL.md).
