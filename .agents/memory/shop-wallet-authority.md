---
name: Shop wallet authority
description: Preventing item purchases from being undone by the app's existing local-first point synchronization.
---

Item purchases must be validated and deducted atomically on the server. After a successful purchase or authenticated shop refresh, the server-confirmed point balance must immediately replace the local feed-point balance.

**Why:** General app progress is still synchronized from local storage. If the device keeps a pre-purchase balance, a later general sync can overwrite the server deduction and effectively refund the purchase.

**How to apply:** Any future wallet, shop, or cloud-sync change must preserve server-side purchase transactions and reconcile the returned balance into local state before another general sync can run.