# Dilz Google Play readiness

Updated: 2026-07-23

## Implemented in the repository

- Capacitor 8 Android project in `android/` with application ID `app.dilz.mobile` (matches the iOS bundle ID), versionCode 1 / versionName 1.0.
- `compileSdk`/`targetSdk` 36, `minSdk` 24 — comfortably meets Play Console's target API level requirement.
- Production shell opens `https://dilz.vercel.app` over HTTPS, same offline fallback page as iOS.
- Branded launcher icon (legacy + adaptive, all densities) and splash screen, generated from the same source artwork as the iOS app via `npm run icons:generate`.
- `android:supportsRtl="true"` set for Hebrew layout.
- Same Supabase auth, privacy policy, terms, support pages and account deletion as the web/iOS app — no Android-specific backend work needed.

## Blocking external work before submission

1. Create a Google Play Console account (one-time $25 fee) and a new app entry.
2. Generate a release signing keystore (`keytool -genkey -v -keystore dilz-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias dilz`) and store it somewhere safe — **never commit it** (`android/.gitignore` now blocks `*.jks`/`*.keystore`/`key.properties`). Play App Signing is recommended: upload this as your "upload key" and let Google manage the final signing key.
3. Configure `android/app/build.gradle` `signingConfigs` for the `release` build type (currently unsigned/debug-only) — typically via a local, untracked `key.properties` file.
4. Native push: the app currently ships web-push only (see `lib/alerts.js`). Android push through `@capacitor/push-notifications` needs a Firebase project and `google-services.json` dropped into `android/app/` before it will deliver notifications (same gap flagged for iOS APNs in `READINESS.md`).
5. Build a release AAB (`./gradlew bundleRelease` from `android/`) and test it on a physical Android device or Play Console's internal testing track.
6. Complete the Play Console "Data safety" form — reuse the same data-collection answers already drafted for Apple in `APP_STORE_CONNECT.md` (email, name, user content, precise location on request, no tracking, no ads).
7. New Play Console developer accounts must run a **closed testing track with at least 12 testers for 14 days** before Google allows a production release — plan for this lead time.
8. Fill out the Content rating questionnaire, target audience, and Data safety section; add the same screenshots/description drafted for the App Store (adapt aspect ratios — Play requires phone screenshots at minimum 16:9 or 9:16).
9. Test the same device checklist as `NATIVE_RELEASE.md` (sign up, post a deal, camera, location, vote, report/block, notifications, RTL, account deletion) on a physical Android phone.

## Principal rejection risks

- **Unsigned/debug release**: Play Console rejects an unsigned or debug-signed AAB outright — signing must be configured first.
- **Target API level**: already compliant at 36, but re-check against Play's current minimum before each future release (Google raises this yearly).
- **Data safety mismatch**: declared data types must match what the app actually collects, same caveat as Apple's privacy labels.
- **New personal developer account friction**: expect Google's closed-testing requirement and a manual review pass (slower than Apple's for first submissions from a new account).
- **Broken support contact**: same requirement as iOS — Google may test the support URL/email during review.
