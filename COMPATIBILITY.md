# Compatibility and test scope

This coordinated release targets OpenClaw 2026.9.6. Product-specific prerequisites in README
and SKILL metadata still apply. A target is not evidence that every feature or platform was tested.

| Environment | Evidence scope |
|---|---|
| Linux ARM64, Node 24.18.0, Python 3.14.4 | Local repository checks and synthetic examples |
| GitHub Ubuntu runner, Node 24, Python 3.11 | Existing offline CI and documentation contracts; resolved runner versions appear in job logs |
| OpenClaw 2026.9.6, gpt-5.6-sol, reasoning low | Prior standalone/suite/plugin/catalog onboarding; this release adds isolated CS prompt-context checks |
| Other OpenClaw versions, Windows, macOS, other models | Not established by this release |

The detailed cross-repository evidence and exact source pins are in the
[runbook readiness release](https://github.com/rin-proxy/rin-runbook/blob/main/releases/readiness-20260915.md).
Private repository access is required. Synthetic examples can test a preflight refusal; passing
one does not establish production readiness. Production channels, payments, host hardening and
Rin activation are outside this release. Native memory tests use deterministic vectors and do
not establish local embedding-model quality or full end-to-end recall with a downloaded model.
