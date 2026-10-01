# App Review Notes — iOS guest-only release

## Build 18 rejection: unresponsive home actions

The review reported that Record, feeding, chat, and play did not respond on an iPad Air 11-inch (M3), iPadOS 27.0.1. Authentication is not the reported issue in this review.

Touch-handling changes have been made, but this workspace cannot verify UIKit touch handling on a physical iPad. Do not claim that the iPad issue has been reproduced or confirmed resolved until the release build has been tested there.

### Reply while preparing the corrected release (safe to send now)

```text
Hello,

Thank you for the detailed feedback and the device information.

We are investigating the unresponsive action buttons reported in build 18. We have made changes to the home screen's touch handling and will verify the Record, feeding, chat, and play flows in a new iOS release build before resubmitting.

No account or sign-in is required in the iOS version.

Thank you.
```

### Release-device checklist before resubmitting

- Test a clean install and an update over build 18 on an iPad.
- Wait for the loading screen to clear and dismiss the new-character greeting, if shown.
- Tap the center and lower part of each home action in portrait and landscape.
- Record: open the record screen, save a mood record, and check that it persists after restarting.
- Feeding: open the food picker; earn enough YOKI points if necessary, feed the character, and check the points/satiety change.
- Chat: open chat, type and send a message, and verify a response or an actionable network error.
- Play: during an available play period with attempts remaining, open the game picker, start a game, and verify its controls.
- Repeat after closing and reopening the app. Also check an iPhone release build.
- Keep the final build number, tested device/OS, and results. Only then state that verification succeeded.

---

## App Review Information → Notes

Use the following text in **App Review Information → Notes**. Remove every previously supplied demo username, password, and authentication-code instruction before submitting the new build.

```text
NO SIGN-IN OR ACCOUNT IS REQUIRED OR AVAILABLE IN THIS iOS VERSION.

Please do not use any demo account or credentials from an earlier submission. This build does not expose sign-in, account creation, email verification, or authentication-code screens on iOS.

Review steps:
1. Launch the app.
2. Complete the short onboarding flow.
3. The app opens directly to its main experience.
4. On the home screen, tap Record, feeding, chat, and play to open their respective screens or pickers.

All core features are available without authentication, including mood records, daily check-ins, AI chat, character growth, mini-games, the item shop, and character customization. Records, progress, purchased items, and settings are stored locally on the device.

No phone call, verification email, authentication code, username, or password is needed to review this build.
```

Suggested Resolution Center reply after uploading the new build:

```text
Hello,

Thank you for your feedback. We have submitted a new build that removes account authentication from the iOS version.

The new iOS build does not expose sign-in, account creation, email verification, or authentication-code screens. No demo account or authentication code is required. Please disregard all credentials provided with earlier submissions.

To review the app, launch it and complete the short onboarding flow. All core features are then available directly without authentication.

Thank you.
```