# Step 7 — SwiftUI shell and TestFlight readiness

**Status:** Local scaffold complete; signed archive and TestFlight upload blocked by Step 2  
**Completed locally:** August 26, 2026  
**Minimum deployment target:** iOS 18.0  
**Bundle identifier:** `app.saturnpath.ios`  
**Display name:** `SaturnPath: Free SAT Prep`  
**Version/build:** `0.1.0 (1)`

## Outcome

The native iPhone app now exists under `apps/ios/` as an Xcode project with a shared scheme, three build configurations, a minimal SwiftUI shell, app icon, privacy manifest, unit tests, and a launch UI test.

The shell deliberately establishes only the V2 visual foundation. It uses the approved light V2 palette, thick orbital rings, restrained glass material, native system typography, and accessibility identifiers. It does not import views, styles, components, or visual assets from the V1 web application.

## Project structure

- `apps/ios/SaturnPath.xcodeproj` — Xcode project and shared `SaturnPath` scheme.
- `apps/ios/Config` — shared, Debug, Staging, and Release configuration files.
- `apps/ios/SaturnPath/App` — SwiftUI app entry point and foundation shell.
- `apps/ios/SaturnPath/DesignSystem` — V2 colors and environment selection.
- `apps/ios/SaturnPath/Resources` — asset catalog and privacy manifest.
- `apps/ios/SaturnPathTests` — Swift Testing unit coverage.
- `apps/ios/SaturnPathUITests` — launch and accessibility smoke coverage.
- `apps/ios/Brand/AppIcon.svg` — editable source for the V2 app icon.

## Build environments

| Configuration | Compile condition | Intended use |
|---|---|---|
| Debug | `DEBUG` | Local development and simulator tests |
| Staging | `STAGING` | Staging API and pre-release device validation |
| Release | `PRODUCTION` | Signed archives, TestFlight, and App Store |

No Supabase secret or server credential is embedded in the target. Client-safe staging configuration will be added when the network layer is implemented. Service-role keys must remain server-side.

## Verification completed

The following checks passed on Xcode 26.6 with the iOS 26.5 SDK:

- Xcode project discovery found the app, unit-test, and UI-test targets and the shared scheme.
- Debug simulator build succeeded for the generic iOS Simulator destination.
- Staging simulator build succeeded for the generic iOS Simulator destination.
- Unsigned Release device build succeeded for `generic/platform=iOS`.
- Two Swift unit tests passed on an iPhone 17 Pro simulator.
- The launch UI test passed and confirmed the title and environment status accessibility identifiers.
- The privacy manifest passed `plutil -lint`.
- The 1024×1024 app icon compiled successfully and contains no alpha channel.
- The running shell was visually inspected on an iPhone 17 Pro simulator for safe-area spacing, contrast, hierarchy, light appearance, and V2 visual separation from V1.

## Why TestFlight is not complete

The source and build settings are ready for signing, but this Mac currently reports `0 valid identities found`. A signed archive fails with:

> Signing for “SaturnPath” requires a development team.

This is the expected dependency on Step 2, not an app-source failure. TestFlight requires all of the following before the remaining part of Step 7 can be completed:

1. Activate the individual Apple Developer Program membership.
2. Sign into that Apple ID in Xcode.
3. Select the paid development team for the `SaturnPath` target.
4. Register the explicit App ID `app.saturnpath.ios`.
5. Create the App Store Connect app record using SKU `SATURNPATH-IOS-001`.
6. Create a signed Release archive, validate it, upload build 1, and confirm processing in TestFlight.

Do not change the permanent bundle identifier when completing these actions.

## Completion rule

The local engineering portion of Step 7 is complete. Keep checklist item 7 open until build 1 is visible in App Store Connect/TestFlight. Once the Apple membership is active, resume this step before beginning any work that requires Sign in with Apple entitlements.
