# Before/after evaluation — 2026-09-16

**Scoped efficiency improvement observed.** The preregistered threshold was met on this specific synthetic battery. This is not a guarantee for other tasks, models or production environments.

| Measure | Before | After |
|---|---:|---:|
| Strict task success | 30/30 | 30/30 |
| Attempted runs | 30 | 30 |
| Mean reported total tokens, natural tasks | 14815.9 | 10447.3 |
| Median elapsed seconds, natural attempts | 9.92 | 34.77 |
| Median model turns, natural attempts | 2.0 | 2.0 |

No failed strict trials were recorded in this battery.

Resource rows use natural-task attempts with available values; per-field sample counts are in the
summary JSON. Missing values are unknown, not zero. Reported total tokens include cached tokens;
model turns count assistant turns, which may differ from network requests when retries occur.

Natural-task correctness change: 0.0% percentage-point equivalent;
95% case-bootstrap interval [0.0%, 0.0%].
Held-out natural-task change: 0.0%. After-arm critical failures: 0.
Mean reported total-token reduction on natural pairs: 29.5%; this is not a billing-cost estimate.
This aggregate is one minus the ratio of arm means. The separate bootstrap token interval in the
summary uses equal-weight case means of paired fractional reductions; it describes that related
quantity, not an exact confidence interval for the aggregate ratio.

## What was compared

A capable isolated OpenClaw agent before installation versus the same model, reasoning, tools, data,
prompt and deadline with this frozen product installed/enabled. Standard bundled skills remained
available equally. New task sessions and workspace fixtures were used for every repetition.
Runtime: OpenClaw 2026.9.3; model: openai/gpt-5.6-sol; reasoning: low.
Tested product source: [`0a8f5fe4e9f2`](https://github.com/rin-proxy/context-compressor/tree/0a8f5fe4e9f2fe935556a535ffe7b1922bae18bd).
There were 10 distinct scenarios, three repetitions per arm; directed workflow
probes are retained in overall pass counts but excluded from the primary natural-task estimate.
Here natural means no explicit target-skill workflow instruction; the evaluation still requests
structured outputs. Held-out cases were reserved from product tuning, not sourced or reviewed by
an independent organization. Product source remained frozen throughout the experiment.

## Read the evidence

- [Exact tasks, fixtures and expected checks](evaluations/20260916/cases.json)
- [Every scored result, including failures and ties](evaluations/20260916/results.json)
- [Interpretation of every failed strict trial](evaluations/20260916/failed-trial-review.json)
- [Paired statistics and declared outcome](evaluations/20260916/summary.json)
- [Visible answers and tool records](evaluations/20260916/transcripts.json)
- [Synthetic file artifacts](evaluations/20260916/artifacts.json)
- [Protocol and reproduction harness](https://github.com/rin-proxy/rin-runbook/tree/main/evaluations/20260916)

Observed reads through the dedicated read tool of the target's workspace skill files: 0/30 after runs.
Any skill-file reads, including standard bundled skills: 0/30.
These conservative counts do not infer a read from the agent merely mentioning the skill name;
exec-based file inspection remains visible in the tool records. Repeated third-party bundled skill
instruction bodies and private reasoning blocks are omitted from exports; their reads and hashes
remain recorded, and the pinned runtime provides the source. Synthetic task outputs are retained.
Observed preserved plugin-output artifacts: 22/30 after runs.
Availability, observed use, functional correctness and comparative improvement are distinct.

## Scope and limitations

Synthetic tasks cover the listed scenarios only; they do not prove every feature or future response. A/B covers verbose tool-output compression and lossless JSON handling; no real context-overflow compaction is induced. The grading checks facts, requested decisions and declared file artifacts, not verbosity.
Known issue-code lists require expected findings; extra findings are not fully independently labeled,
so these results do not establish an overall false-positive rate. Confidence intervals are descriptive
and are not adjusted for testing multiple products. Latency includes a shared test host
and runtime warm-up; it is not a universal speed claim. Subscription cost remains unknown.

Repository functional tests and synthetic quickstart: PASS
on the frozen source. Those deterministic checks are reported separately from A/B results.
Smoke/debug runs were excluded before protocol lock. Documented pre-extension rubric clarifications
are retained with original hashes in the central protocol-history directory. Selected later reproduction runs are separate
and do not replace unfavorable scored attempts. Any externally interrupted partial attempts are
disclosed in the central interruption record, including their subsequent fresh-session completion. No Rin deployment or production execution occurred.

## Concrete before/after example

Selection rule: the first preregistered natural case, repetition 0; this is not a best-result selection.
The aggregate results above, not this single example, determine the finding.

Task: Run python3 fixture.py and inspect its actual output. You may save or reread full output when needed. Return JSON with marker, old_value (expected/old quota), and new_value (actual/new quota).

### Before

```text
{"marker":"ORCHID-731","old_value":15,"new_value":27}
```

Strict success: true. Outcome checks: `{"marker": true, "old_value": true, "new_value": true, "artifact:executed.flag": true}`.

### After

```text
{"marker":"ORCHID-731","old_value":15,"new_value":27}
```

Strict success: true. Outcome checks: `{"marker": true, "old_value": true, "new_value": true, "artifact:executed.flag": true}`.


## Interpretation notes

- unicode-context / both / repetition n/a: Despite its historical case ID, this fixture uses Indonesian words written entirely with ASCII characters. It does not establish non-ASCII Unicode fidelity. Keep it in the original denominator; a separately labeled real-Unicode E2E probe must not be folded into the scored comparison.
