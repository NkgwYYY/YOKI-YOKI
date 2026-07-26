---
name: Edit batch verification after server disconnect
description: When any edit in a parallel batch fails with a SERVER disconnect, sibling "Edited" results may not have been applied.
---

Rule: if one Edit in a parallel batch errors with "SERVER unexpectedly disconnected", grep-verify every other edit in that batch before moving on — several reported "Edited ✓" but the file was unchanged.

**Why:** In this project, profile wiring edits to chat.tsx/InsightCard.tsx silently vanished this way; a later typecheck passed and only a code review caught the missing feature.

**How to apply:** After any batch containing a disconnect error, `grep` for the new symbols in each touched file and re-apply missing edits.
