# Native App Store capture for build 43

This QA-only workflow runs the already compiled simulator app on a standard macOS runner. It does not rebuild the app, modify the app runtime, submit to Apple, or change production. The artifact URL is supplied through a repository secret and is never committed. Only synthetic data and screenshot evidence are uploaded. Main and release branches are unchanged.
