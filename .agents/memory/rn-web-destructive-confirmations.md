---
name: RN-web destructive confirmations
description: Cross-platform confirmation behavior for actions that must execute from a secondary button
---

Do not use `Alert.alert` button callbacks as the execution path for destructive actions that must also work on React Native Web. Use an app-rendered modal or dialog with real press handlers.

**Why:** React Native Web can display the alert text without executing the supplied multi-button callback, making the UI appear responsive while the destructive request is never sent.

**How to apply:** Use the shared in-app dialog component for account deletion and similar confirmations. Keep `Alert.alert` only for simple one-button error messages.