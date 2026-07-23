# Native tab bar — options and plan

_Updated: 2026-07-23_

## What we ship today

The bottom navigation is a **web (HTML/CSS) tab bar** (`components/layout/BottomNav.js`
+ the `.dilz-tabbar` rules in `styles/globals.css`), tuned to match a native
iOS `UITabBar`: 49pt height, 25pt icons, SF Pro labels, a translucent blurred
material, a 0.5px hairline separator, filled-vs-outline icons for
selected/unselected, and the home-indicator safe area.

This is the standard approach for a Capacitor app and, on a real device, is
very close to native. **It is the only bottom bar that appears when the app is
run as a website** — a browser tab or a Safari **“Add to Home Screen”** PWA.
Those modes have no native layer, so a real `UITabBar` is impossible there.

## Why a real `UITabBar` is a bigger change

A genuine native tab bar is a UIKit control that lives **outside** the web
view. It only exists in the **compiled Capacitor app** (built in Xcode on a
Mac, installed via TestFlight/App Store) — never in a PWA.

Two things make it non-trivial here:

1. **The app loads remote content.** `capacitor.config.ts` sets
   `server.url: 'https://dilz.vercel.app'`, so the web view renders the live
   site. A native bar would have to (a) tell that remote page to navigate and
   (b) read the page’s current route back to highlight the right tab — a
   two-way native↔web bridge across a remote origin, which is fragile.
2. **It splits the navigation source of truth.** Today routing lives entirely
   in the web app (`GlobalBottomNav.js`). A native bar means the native side
   owns tab state and the web side owns everything else; they must stay in
   sync on every route change, deep link, and back gesture.

## The realistic options, honestly ranked

1. **Keep the polished CSS bar (recommended).** What we do now. Zero native
   code, one codebase, ships to web + PWA + native identically. On device it
   reads as native. This is what the large majority of hybrid apps do.

2. **Native `UITabBarController` hosting web views.** Restructure the iOS
   project so a native tab controller owns 5 tabs, each showing the web app at
   the matching route (ideally bundling the web build locally with
   `output: 'export'` instead of the remote `server.url`, so navigation is
   instant and offline-safe). Real native chrome; real native cost — you’re
   now maintaining a native shell alongside the web app, and Android needs the
   equivalent `BottomNavigationView`.

3. **Go fully native (SwiftUI/UIKit).** If pixel-perfect native chrome is a
   hard requirement across the whole app, a native rewrite is the honest
   answer — but that abandons the shared web codebase Capacitor gives you.

## If you choose option 2 — concrete steps (needs a Mac + Xcode)

1. Switch the web build to static export and bundle it locally instead of the
   remote URL:
   - `next.config.mjs`: add `output: 'export'` (verify all pages are
     export-compatible — dynamic API routes must move to the deployed backend).
   - `capacitor.config.ts`: drop `server.url`; point `webDir` at the exported
     `out/`. Run `npm run build && npx cap sync ios`.
2. In Xcode, replace the single root `CAPBridgeViewController` with a
   `UITabBarController` whose 5 items are `CAPBridgeViewController`s, each
   opening a start path (`/`, `/explore`, `/post`, `/alerts`, `/profil`).
3. Hide the web `.dilz-tabbar` when running natively (e.g. add a
   `capacitor` body class via `Capacitor.isNativePlatform()` and
   `.capacitor .dilz-tabbar { display: none }`), so only the native bar shows.
4. Bridge the “post” and auth-gated tabs to the web app’s existing handlers,
   and reflect web route changes back to `selectedIndex` via a small Capacitor
   plugin or `postMessage`.
5. Repeat for Android with a `BottomNavigationView` in `MainActivity`.
6. Test tab switching, deep links, the Android back button, and state
   restoration on physical devices.

## Recommendation

Ship the polished CSS bar now (it’s live and looks native on device), and only
take on option 2 if, after testing the **compiled** app on a real iPhone, the
web bar still isn’t good enough. Decide that from the native build — not from
the Safari “Add to Home Screen” PWA, where no bottom bar can ever be native.
