# Dilz App Store readiness

Updated: 2026-06-19

## Implemented in the repository

- Capacitor 8 iOS project in `ios/` with bundle identifier `app.dilz.mobile`.
- Production shell opens `https://dilz.vercel.app` over HTTPS and has an offline fallback page.
- Contextual iOS location permission and camera permission descriptions.
- Native privacy manifest with no tracking declaration and the data categories used by Dilz.
- Public Privacy Policy, Terms of Use and Support pages.
- In-app account deletion that removes private data and anonymizes public contributions.
- User-generated content filtering, reporting, blocking and an admin moderation queue.
- English and Hebrew interface support.
- Web manifest and mobile application metadata.

## Blocking external work before submission

1. Enroll in the Apple Developer Program and create the App ID.
2. Confirm the final bundle identifier before creating the App Store Connect record. Changing it later creates a different app.
3. Replace the generated Capacitor app icon and splash artwork with approved Dilz production assets. The current generated Capacitor icon must not be submitted.
4. Set `NEXT_PUBLIC_SUPPORT_EMAIL` in Vercel to a monitored, verified address and redeploy.
5. On a Mac with Xcode 26 or later, open `ios/App/App.xcodeproj`, select the Apple team and configure automatic signing.
6. Add the Push Notifications capability and an APNs key. Native push delivery still needs server-side APNs integration; web-push credentials do not send iOS native tokens.
7. Configure Associated Domains and universal links if confirmation links must return directly to the app.
8. Create a dedicated App Review account with representative content and no admin privileges.
9. Test account creation, email confirmation, login, posting, photo upload (including from the camera), location, voting, comments, report, block and account deletion on physical iPhones.
10. Upload screenshots captured from the signed build, complete the privacy questionnaire and age-rating questions, then submit through App Store Connect.

## Principal rejection risks

- Guideline 4.2: a remote web shell can be considered a repackaged website. Before submission, native push, contextual location, camera photo capture and app deep links should all be demonstrably operational.
- Guideline 1.2: reports need timely human review. Monitor the admin queue and document the moderation response process.
- Broken support contact: Apple may test the support URL and email.
- Incomplete privacy labels: App Store Connect answers must match `PrivacyInfo.xcprivacy` and `/privacy`.
- Default assets or incomplete screens on an iPhone size can cause a metadata or quality rejection.
