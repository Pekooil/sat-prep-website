# SaturnPath iOS

Native SwiftUI app for SaturnPath V2.

## Open and run

```bash
open apps/ios/SaturnPath.xcodeproj
```

Select the shared `SaturnPath` scheme and an iPhone simulator. The minimum supported version is iOS 18.0.

## Command-line verification

```bash
xcodebuild \
  -project apps/ios/SaturnPath.xcodeproj \
  -scheme SaturnPath \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/saturnpath-ios-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Run the unit and launch UI tests on an available simulator:

```bash
xcodebuild \
  -project apps/ios/SaturnPath.xcodeproj \
  -scheme SaturnPath \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/saturnpath-ios-test-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  test
```

## Build configurations

- `Debug` — local development; compiles with `DEBUG`.
- `Staging` — staging API and physical-device validation; compiles with `STAGING`.
- `Release` — App Store/TestFlight archive; compiles with `PRODUCTION`.

The shared scheme archives with `Release`. The permanent bundle identifier is `app.saturnpath.ios`.

## Signing status

Automatic signing is configured, but no development team is committed to the repository. After the individual Apple Developer membership becomes active, select the paid team in Xcode for the `SaturnPath` target, register the explicit App ID, create the App Store Connect record, and archive through Product → Archive.

The local scaffold is build- and test-verified. The current TestFlight blocker and exact remaining signing steps are recorded in `docs/ios/STEP-07-SWIFTUI-SHELL-AND-TESTFLIGHT.md`.

Do not commit certificates, provisioning profiles, Apple credentials, database passwords, or Supabase service-role keys.
