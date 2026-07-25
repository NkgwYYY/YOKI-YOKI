---
name: Clerk auth migration
description: Auth moved to Replit-managed Clerk (July 2026); constraints to remember
---
- Login is Replit-managed Clerk: Google/Apple SSO + email/password. Old custom JWT accounts and their server-side user_data links were intentionally dropped (user consented).
- **Why:** user has no email service/domain; Clerk sends verification & password-reset emails itself.
- **How to apply:** never reintroduce custom auth routes or an email provider for auth mail. SSO provider toggles (e.g. enabling Apple) are managed in the workspace Auth pane, not code. Dev and prod Clerk user stores are separate — accounts made in preview don't exist in the published app.
- api-server typecheck needs `pnpm exec tsc -b lib/db` after schema changes (stale dist/*.d.ts otherwise).
