# Costume StoreKit validation

This dedicated QA branch type-checks the release candidate purchase actor against the real iOS Simulator StoreKit SDK. It uses the standard public macOS runner and requires no secrets or signing credentials. It does not build the application, perform purchases, deploy, or submit an App Store review. Production source remains in the release candidate source archive.
