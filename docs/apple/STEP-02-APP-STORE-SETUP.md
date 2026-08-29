# Step 2: Apple Developer and App Store Connect Setup

**Status:** Prepared; blocked until Apple Developer Program membership is active  
**Updated:** August 26, 2026  
**Enrollment type:** Individual

## Approved identifiers

| Field | Approved value |
|---|---|
| App Store display name | `SaturnPath: Free SAT Prep` |
| Official website | `https://saturnpath.app` |
| Explicit bundle identifier | `app.saturnpath.ios` |
| App ID description | `SaturnPath iOS` |
| Internal App Store Connect SKU | `SATURNPATH-IOS-001` |
| Primary language | English (U.S.) |
| Platform | iOS |
| App access | Full Access |
| Enrollment entity | Individual |

The bundle identifier uses the official domain in reverse-DNS order: `saturnpath.app` → `app.saturnpath`, followed by the iOS product suffix.

## Approved App ID capabilities

- Sign in with Apple
- Push Notifications

Additional capabilities will be enabled only when an implemented feature requires them.

## Current prerequisite state

- [x] Xcode 26.6 is installed.
- [ ] Active paid Apple Developer Program membership.
- [ ] Apple Account added to Xcode.
- [ ] Valid Apple Development signing identity available on this Mac.
- [ ] Latest Apple developer agreements accepted.
- [ ] Explicit App ID registered.
- [ ] App Store Connect app record created.

The local signing check currently reports no valid code-signing identities. This is expected before enrollment and Xcode account setup.

## Action required from Darcy

Enroll in the Apple Developer Program as an **individual** using the Apple Developer app. Apple requires the account holder to complete identity verification, accept legal terms, and pay for membership; these steps cannot be delegated.

Apple's enrollment instructions: [Enroll using the Apple Developer app](https://developer.apple.com/help/account/membership/enrolling-in-the-app/).

For an individual membership, the legal personal name associated with the account will appear as the seller name on the App Store. Verify the account name and address carefully before submitting enrollment.

After Apple confirms that the membership is active:

1. Open Xcode → Settings → Accounts.
2. Add the enrolled Apple Account if it is not already listed.
3. Confirm that the paid team appears.
4. Allow Xcode to manage the Apple Development signing certificate.
5. Tell Codex that enrollment is active and the Apple Account is available in Xcode.

Do not share the Apple Account password, two-factor authentication code, recovery key, certificate private key, or App Store Connect API private key in the repository or chat.

## Registration actions after membership activates

### A. Register the explicit App ID

In Certificates, Identifiers & Profiles:

1. Add a new identifier.
2. Select App IDs → App.
3. Enter description `SaturnPath iOS`.
4. Choose Explicit App ID.
5. Enter bundle ID `app.saturnpath.ios`.
6. Enable Sign in with Apple.
7. Enable Push Notifications.
8. Review and register.

Apple requires the explicit App ID to match the Xcode target bundle ID: [Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id/).

### B. Create the App Store Connect record

In App Store Connect → Apps:

1. Select New App.
2. Platform: iOS.
3. Name: `SaturnPath: Free SAT Prep`.
4. Primary language: English (U.S.).
5. Bundle ID: `app.saturnpath.ios`.
6. SKU: `SATURNPATH-IOS-001`.
7. User Access: Full Access.
8. Create the record and save its generated Apple ID in the private release inventory.

App Store Connect requires an accepted current agreement before a new app can be added: [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).

## Verification and completion criteria

Step 2 is complete when all of the following are true:

- [ ] Individual Apple Developer membership shows Active.
- [ ] `app.saturnpath.ios` appears as an explicit identifier.
- [ ] Sign in with Apple and Push Notifications are enabled.
- [ ] `SaturnPath: Free SAT Prep` appears in App Store Connect.
- [ ] The App Store record uses SKU `SATURNPATH-IOS-001`.
- [ ] Xcode lists the paid development team.
- [ ] At least one valid Apple Development signing identity is available.
- [ ] The final identifiers are copied into the future Release configuration without committing secrets.

## Blocker

Apple Developer Program enrollment is not active yet. No Apple record can be created safely or legitimately until Apple completes that enrollment.

