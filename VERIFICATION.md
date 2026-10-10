# context-compressor: acceptance and recovery

## Offline regression

From the reviewed checkout run `bash test.sh`. It runs the repository's provider-free tests using disposable HOME/workspaces. Exit 0 means those tests passed, not that every real model/provider/environment was exercised. Lifecycle tests cover install → reinstall → full-commit update → rollback → uninstall and preserve owner data where applicable. Optional native test skips are printed explicitly.

## Functional acceptance

Input / command: `bash test.sh`; in an isolated SDK/Gateway, execute a long synthetic diff and a structured JSON research result.

Expected result: Diff preserves full output in a private scoped file and includes its pointer. A Code Mode exec envelope remains valid JSON while its plain-text `value.aggregated` field is shortened and points to the complete saved stdout. Arbitrary JSON, structuredContent, research and handoff results remain complete. Unknown scope/save failure leaves original unchanged.

Scope and remaining integration checks: For actual SDK harness, set OPENCLAW_SDK_REAL=1 for the three integration scripts with a matching openclaw dependency. After plugin code changes restart the selected Gateway and verify a new result; hot reload may retain old code.

## Failure handling

Keep the exit status, redacted stderr, exact source commit and relevant artifact paths. A missing dependency/probe or incomplete check is not a pass. Reproduce on an isolated fixture; after a change rerun the failed case and this entrypoint. Use the README's matching workspace/instance for rollback. Preserve memory, configuration, queues and evidence files unless their removal is separately intended.
