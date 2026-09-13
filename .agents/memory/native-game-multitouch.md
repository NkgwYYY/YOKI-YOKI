---
name: Native game multitouch
description: Preserve simultaneous directional and action controls in touch games
---

Native action-game controls must be managed by one parent responder that tracks each active touch identifier and maps it to an independent control state. Separate sibling Pressables are not reliable for holding direction with one finger while pressing jump with another.

**Why:** React Native sibling Pressables compete for the JS responder; a second finger could cancel or fail to acquire a sibling, clearing horizontal movement during jump even though the physics supported both inputs.

**How to apply:** Use one native touch surface, recompute held controls from all active touches, and release only controls no remaining touch owns. Keep web pointer and keyboard handling on their existing separate path.