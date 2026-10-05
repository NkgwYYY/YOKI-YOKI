---
name: Edit batch verification after server disconnect
description: When any edit in a parallel batch fails with a SERVER disconnect, sibling "Edited" results may not have been applied.
---

Rule: if one Edit in a parallel batch errors with "SERVER unexpectedly disconnected", grep-verify every other edit in that batch before moving on — several reported "Edited ✓" but the file was unchanged.

**Why:** In this project, profile wiring edits to chat.tsx/InsightCard.tsx silently vanished this way; a later typecheck passed and only a code review caught the missing feature.

**How to apply:** After any batch containing a disconnect error, `grep` for the new symbols in each touched file and re-apply missing edits.

Repository merge state can also change between inspection and resolution during a workspace transition. Verify the live merge state before editing conflict files rather than relying on previously observed markers.

**Why:** A merge returned conflicts, but a subsequent workspace transition restored a clean main branch while leaving the fetched remote ref available. Earlier conflict observations no longer described the working tree.

**How to apply:** Recheck the current branch, working-tree status, and active merge before resolving or committing. If a Git lock appears, verify whether it is in use; never remove an active lock merely to retry an operation.
