# Contributing to Smart Cache Pro

Thanks for your interest — bug reports and fixes are very welcome.

## Reporting bugs
Open an issue with: your **OpenClaw version**, the **plugin version**, your config, exact
**repro steps**, and expected-vs-actual. Runtime-version–specific behavior (e.g. a hook/middleware
seam that changed between releases) is especially useful — call out the version you saw it on.

## Pull requests
- **Run the tests first:** `npm test` (compressor unit + middleware integration). Both suites must
  pass; CI runs them on every PR.
- Keep changes **backward-compatible** where you can, and **defensive** — this plugin runs
  in-process, so a handler must never break a tool call: wrap in `try/catch` and leave the original
  result untouched on any error.
- If you touch a runtime seam, prefer **additive** changes and keep the previous path as a fallback.
- In the PR, explain the **root cause** (the *why*), and note which **OpenClaw version(s)** you
  verified against.

## Licensing of contributions
This project is proprietary — all rights reserved (see `package.json` / `README.md`). By submitting a
contribution you represent that it is your own work, and you grant the maintainer a perpetual,
worldwide, irrevocable, royalty-free license to use, reproduce, modify, sublicense, relicense, and
distribute it as part of Smart Cache Pro, including in commercial releases. You retain copyright to
your contribution.

Thanks again — well-reasoned, tested contributions are genuinely appreciated.
