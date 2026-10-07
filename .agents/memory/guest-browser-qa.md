---
name: Isolated guest browser verification
description: Safe request guards for Expo guest QA without false startup or API failures
---

Use a fresh isolated browser context and synthetic guest data. Request guards must distinguish anonymous SDK initialization and read-only AI calls from account/cloud mutations.

**Why:** Blocking every POST made Clerk's anonymous development-browser initialization fail and left the guest preview blank. Restricting app API allowances to the Expo UI hostname also blocked valid calls to the separately routed development backend, producing test-harness failures rather than application defects.

**How to apply:** Identify the actual development host and exact initialization endpoint from observed traffic; narrowly permit only necessary anonymous startup requests, never blanket-allow authentication endpoints. Match explicitly approved read-only AI paths on the actual development backend as well as the UI origin. Keep login, profile, purchase and cloud mutations blocked. Report harness-blocked checks separately from application failures; never infer a passing API call from a fallback greeting.
