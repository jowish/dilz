# Dilz

Dilz compares supermarket prices in Israel and provides a community feed for local and online deals.

## Stack

- Next.js 16 Pages Router and React 19
- Supabase PostgreSQL, Auth, and Storage
- Israeli price-transparency feeds for product, store, price, and promotion imports
- Web Push for saved-deal alerts

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. Run the SQL files in the Supabase SQL Editor in this order:
   - `supabase-core-setup.sql`
   - `supabase-product-images-setup.sql`
   - `supabase-deal-images-setup.sql`
   - `supabase-votes-setup.sql`
   - `supabase-alerts-setup.sql`
4. Start the application with `npm run dev`.

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to browser code.

## Commands

- `npm run dev`: start the development server
- `npm test`: run the unit tests
- `npm run build`: create a production build
- `npm run check`: run tests followed by the production build

## Data imports

Imports write with `SUPABASE_SERVICE_KEY`; public clients only receive read access to catalog data.

```powershell
node scripts/import-magasins.js
node scripts/import-prix.js
node scripts/import-promos.js
node scripts/import-images.js
node scripts/traduire-produits.js
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

## Community deals

Authenticated users can publish deals with an image, vote, comment, edit their own deals, and create alerts. The API derives the author identity from the Supabase access token rather than trusting request bodies.

Automated deals inserted by `scripts/deal-bot.js` use the `pending` status. Approve or reject one with a server-to-server request:

```powershell
$headers = @{ Authorization = "Bearer $env:ADMIN_BOT_TOKEN" }
$body = @{ id = 123 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/approve -Headers $headers -ContentType application/json -Body $body
```

Use `/api/admin/reject` to reject it. Admin tokens must be sent in a header, never in the URL.

## Deployment checklist

- Configure all values from `.env.example` in the hosting environment.
- Run every Supabase migration before deploying application code.
- Run `npm run check`.
- Schedule catalog imports separately from the web process.
- Configure VAPID values only when push notifications are required.
