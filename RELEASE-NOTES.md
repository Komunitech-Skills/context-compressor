# v1.0.1 — activation model

Declares passive plugin activation outside model skill discovery. Schedules remain disabled by default, and this release does not deploy or reconfigure Rin.

# v1.0.0 — portfolio contract

Rename the plugin and package ID to `context-compressor`. Add atomic config migration with dry-run, duplicate-ID refusal and rollback. Preserve lossless research, structured results and agent handoffs. No change is deployed directly to Rin.

# v2026.09.15-readiness.1

Documentation links and declared lifecycle CLI flags are checked in CI; the existing synthetic example remains required.

All active product READMEs have maintained local-link/anchor and declared CLI/config contracts.
Run `python3 scripts/check-docs.py`, `bash test.sh` and `bash examples/quickstart.sh` from a
reviewed checkout. The checker is distributed from rin-runbook with a SHA256 content pin in
`docs-contract.json`; product-specific declarations remain local. External links are not fetched.
Checks cover listed documents and declared public interfaces, not every prose claim or CLI option.

See [compatibility and verification scope](COMPATIBILITY.md). This release changes repositories
and test tooling only; it does not activate agent schedules, channels or Rin. Source release
archives and SHA256SUMS are published with the GitHub release. The release tag identifies a
coordinated repository snapshot, not a change to every product's own runtime package version.
