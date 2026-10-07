---
name: Scoped pnpm dependency resolution
description: Why targeted update commands still need a lockfile-diff and resolved-version check
---

A successful scoped pnpm update is not proof that a requested transitive security dependency was upgraded. It can refresh other range-based aliases while leaving that transitive version unchanged.

**Why:** A targeted recursive-depth update refreshed compiler/tool aliases without replacing the vulnerable Express subdependency. The successful command was therefore not a successful mitigation.

**How to apply:** Compare the lockfile against the initial snapshot, verify all resolved instances of the vulnerable module, and exclude unrelated version churn. If no compatible parent upgrade supplies the fix, use a narrow compatible override and validate with a frozen-lockfile install and an audit. Never bypass the publishing security gate or claim the entire audit is clean just because one blocker was removed.
