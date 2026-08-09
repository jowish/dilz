# Dilz

Dilz is a community platform for sharing deals. Any user who spots an
interesting promotion — in a store, online, anywhere — posts it to the
Dilz feed, where the community can see it, vote on it, comment and share it.

Deals are geolocated, so people find what is worth their time near them.


## iOS application

The Capacitor 8 iOS shell lives in `ios/` and loads the production Dilz application from `https://dilz.vercel.app`. App Store preparation, remaining blockers and the Mac release procedure are documented in `docs/app-store/`.

Run `npm run ios:sync` after changing Capacitor configuration or native plugins. Opening and signing the Xcode project requires macOS with Xcode 26 or later.

## Stack

- Next.js 16 Pages Router and React 19
- Supabase PostgreSQL, Auth, and Storage
- Web Push for saved-deal alerts

Dilz also still carries a legacy Israeli supermarket price-comparison feature (product/price/promotion
imports and a barcode scanner). It is not the product — see
[Legacy: price comparison](#legacy-price-comparison-abandoned) below.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. Run the SQL files in the Supabase SQL Editor in this order:
   - `supabase-core-setup.sql`
   - `supabase-product-images-setup.sql`
   - `supabase-deal-images-setup.sql`
   - `supabase-votes-setup.sql`
   - `supabase-alerts-setup.sql`
   - `supabase-safety-setup.sql`
   - `supabase-native-push-setup.sql`
4. Start the application with `npm run dev`.

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to browser code.

## Commands

- `npm run dev`: start the development server
- `npm test`: run the unit tests
- `npm run build`: create a production build
- `npm run check`: run tests followed by the production build
- `npm run ios:sync`: copy Capacitor configuration and plugins into the iOS project
- `npm run ios:open`: open the iOS project on a Mac with Xcode

## Community deals

Authenticated users can publish deals with an image, vote, comment, edit their own deals, and create alerts. The API derives the author identity from the Supabase access token rather than trusting request bodies.

`scripts/deal-bot.js` (Dilz Scout) fetches candidate deals from the web — KSP, public Telegram channels, authorized Facebook pages and RSS feeds — and inserts them with `pending` status for review. It does not compare prices; it discovers deals to add to Dilz. Approve or reject one with a server-to-server request:

```powershell
$headers = @{ Authorization = "Bearer $env:ADMIN_BOT_TOKEN" }
$body = @{ id = 123 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/approve -Headers $headers -ContentType application/json -Body $body
```

Use `/api/admin/reject` to reject it. Admin tokens must be sent in a header, never in the URL.

## Legacy (abandoned price comparison)

Dilz began as an Israeli supermarket price-comparison tool. That product is dead; Dilz today is the
community deal-sharing platform described above. The price-comparison data pipeline and UI below are
still present in the codebase — not deleted, since the local setup instructions above still depend on
them — but they are not maintained or promoted as a feature.

The **product comparison modal still exists in the app** (`components/deals/PromoModal.js`, opened from
the deals feed, and the inline result view on `pages/scan.js`): given a product with prices at several
stores, it lists each store's price, highlights the cheapest one, and shows the amount saved. It is fed
by the price-transparency imports below and is not connected to community deals.

Imports write with `SUPABASE_SERVICE_KEY`; public clients only receive read access to catalog data.

```powershell
node scripts/import-magasins.js
node scripts/import-prix.js
node scripts/import-images.js
```

The import order matters because prices and promotions reference products, while city search reads normalized stores.

### Product images

Run `supabase-product-images-setup.sql` once before image enrichment. Images are matched only by exact barcode:

```powershell
npm run images:stats
npm run images:import -- --source=shufersal --limit=500
npm run images:import -- --source=open-food-facts --limit=500
```

Shufersal pages are checked first because they cover many Israeli products. Open Food Facts is used as a secondary source and is intentionally rate-limited. Set `OPENFOODFACTS_CONTACT` to a real contact email before running bulk enrichment. Products with short internal produce codes keep the neutral application placeholder instead of receiving an approximate or misleading photo.

Open Food Facts images are attributed in the product comparison modal and remain subject to the source's CC BY-SA terms. Review retailer terms before relying on retailer-hosted images in production.

## Deployment checklist

- Configure all values from `.env.example` in the hosting environment.
- Run every Supabase migration before deploying application code.
- Run `npm run check`.
- Schedule catalog imports separately from the web process.
- Configure VAPID values only when push notifications are required.
