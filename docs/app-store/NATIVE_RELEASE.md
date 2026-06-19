# Native iOS release procedure

## Prerequisites

- macOS with Xcode 26 or later.
- Active Apple Developer Program membership.
- Final bundle identifier and App Store Connect app record.
- Production Dilz icon at 1024x1024 with no transparency.
- Monitored support email and a dedicated App Review account.

## Prepare

```bash
npm ci
npm run check
npm run ios:sync
npm run ios:open
```

In Xcode:

1. Select the `App` target and the production Apple team.
2. Confirm bundle identifier, version and build number.
3. Replace AppIcon and Splash assets.
4. Add Push Notifications and Associated Domains only after their server configuration is ready.
5. Confirm `PrivacyInfo.xcprivacy` is in Copy Bundle Resources.
6. Build and run on a physical iPhone in English and Hebrew.
7. Use Product > Archive, validate the archive, then upload to App Store Connect.

## Mandatory device test

- Clean install and first launch.
- Offline launch fallback.
- Sign up, confirmation and sign in.
- Feed, search, filters, map and back navigation.
- Post/edit/delete a deal and upload one, two and three photos.
- Camera denial and acceptance.
- Location denial and acceptance.
- Vote, comment, report and block.
- Save, alerts and notifications.
- Language and RTL layout.
- Account deletion followed by failed sign-in.
