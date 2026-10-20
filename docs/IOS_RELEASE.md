# iOS release workflow

Run commands from `artifacts/mobile`. Keep the existing Expo project and Apple application identity; do not create a replacement app.

## Build configuration

- `app.json` supplies the existing iOS bundle identifier and a local build-number seed. EAS production builds use the project's remote version counter and increment it.
- `eas.json` defines a store build, a simulator build, the production API host and the existing App Store Connect destination.
- Link to the existing Expo project before building. This checkout intentionally does not invent an `extra.eas.projectId`, owner or credentials.
- Use existing signing credentials where available. Do not commit credentials, tokens or account exports.

```sh
pnpm dlx eas-cli@25.2.0 login
pnpm dlx eas-cli@25.2.0 init
pnpm dlx eas-cli@25.2.0 config --platform ios --profile production
pnpm dlx eas-cli@25.2.0 build --platform ios --profile production
pnpm dlx eas-cli@25.2.0 submit --platform ios --profile production
```

In `init`, choose the existing project and verify its identity against prior builds. Check the plan's available build allowance before starting a remote build. A paid upgrade is not part of this workflow. Inspect the actual build identifier before submission; do not select an older binary by accident.

## Release checks

- Test a fresh installation and an upgrade using a signed native build. JavaScript export alone does not validate an IPA.
- Check home controls, record saving, feeding, chat, travel, back navigation and recovery after backgrounding, on iPhone and iPhone compatibility mode on iPad.
- Slow or failed scene-image loading offers a continue action; its overlay must release touches when dismissed.
- Before AI consent, chat opens the disclosure and retains the typed message, home comments use a local fallback, and insights do not send records. Verify acceptance, withdrawal and account isolation. Device-local care stays available without consent.
- The disclosure identifies the app server/Replit and OpenAI, the data used by each feature and the profile entry for withdrawal. Ad requests never include profile, journal or conversation fields.
- Test ads with Google's test units on development/test devices. Never click production ads as a test.
- Capture screenshots from the actual release build on the target iPhone size. Show real app content; do not substitute browser captures or fabricated native screens.
- Compare the final binary's data flows and SDKs with App Store privacy declarations, age rating and metadata before submitting. Do not assert device verification until it was actually performed.

References: [Expo iOS submission](https://docs.expo.dev/submit/ios/), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Mobile Ads data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure).
