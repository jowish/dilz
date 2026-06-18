# Dilz Premium UI — Codex Implementation Spec

Use this file as the source of truth for the full UI redesign of Dilz.

## Codex instruction

Implement this specification directly in the existing codebase. Do not create a mockup. Do not remove features. Preserve Supabase auth, deal creation, upload, voting, alerts, notifications, profile, filters, API routes, and routing. Refactor UI safely into reusable components. Run lint/build at the end and fix errors.

---

## 1. Product direction

Dilz is a deals app for Israel combining official store promos and community-submitted deals.

The new UI must feel like a premium mobile-first consumer app, not a generic AI-generated website.

Target feeling:

- Premium
- Local
- Fast
- Trustworthy
- Clean
- Useful every day
- Community-powered but polished

Visual references:

- Wolt for local consumer app quality
- Revolut for premium fintech clarity
- Apple Wallet for polished cards
- Airbnb for marketplace simplicity
- Linear for clean interaction quality

Avoid:

- Purple SaaS gradients
- Emoji-heavy UI
- Gaming style
- Coupon clutter
- Random glassmorphism
- Generic AI landing page sections
- Too many colors
- Heavy shadows
- Huge empty hero section

---

## 2. Design tokens

Create or update global CSS variables or Tailwind tokens.

### Colors

```css
:root {
  --bg-app: #F7F9FC;
  --surface-main: #FFFFFF;
  --surface-soft: #F1F5F9;
  --surface-dark: #0B1220;

  --text-primary: #0B1220;
  --text-secondary: #526070;
  --text-muted: #7A8699;
  --text-disabled: #A0AEC0;
  --text-inverted: #FFFFFF;

  --border-default: #E2E8F0;
  --border-strong: #CBD5E1;
  --border-focus: #1D4ED8;

  --brand: #1D4ED8;
  --brand-hover: #1E40AF;
  --brand-active: #1E3A8A;
  --brand-soft: #EAF2FF;
  --brand-softer: #F3F7FF;

  --saving: #15803D;
  --saving-hover: #166534;
  --saving-soft: #EAF8EF;

  --danger: #DC2626;
  --danger-soft: #FEF2F2;
  --warning: #F59E0B;
  --warning-soft: #FFFBEB;

  --vote-up: #15803D;
  --vote-down: #64748B;
  --vote-active-bg: #EAF8EF;
  --vote-neutral-bg: #F1F5F9;
}
```

Do not introduce random colors outside this palette.

### Typography

Use Inter if available. If not, add it cleanly.

Font stack:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Sizes:

- Page title: 32px desktop, 26px mobile, weight 800, line-height 1.12
- Section title: 22px desktop, 19px mobile, weight 700
- Card title: 16px, weight 700
- Body: 14px, weight 400, line-height 1.45
- Small: 13px
- Metadata: 12px, weight 500
- Button: 14px, weight 650
- Bottom nav label: 11px

### Spacing

Use an 8-point system only:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px
- 40px
- 56px

Mobile page padding: 16px.
Desktop page padding: 32px to 48px.
Max content width: 1180px.

### Radius

- Small: 8px
- Medium: 12px
- Large: 16px
- Card: 18px
- XL: 22px
- Modal: 24px
- Pill: 999px

Rules:

- Buttons: 12px
- Cards: 18px
- Modals: 24px
- Inputs: 14px
- Chips: 999px
- Card images: 14px

### Shadows

```css
--shadow-card: 0 8px 24px rgba(15, 23, 42, 0.06);
--shadow-card-hover: 0 16px 40px rgba(15, 23, 42, 0.10);
--shadow-modal: 0 24px 80px rgba(15, 23, 42, 0.22);
--shadow-button: 0 8px 18px rgba(29, 78, 216, 0.20);
```

Avoid heavy black shadows and neon effects.

---

## 3. Components to create or refactor

Create reusable components wherever possible:

- Button
- IconButton
- Badge
- FilterChip
- Input
- Select
- Textarea
- Modal
- Drawer
- Toast
- Skeleton
- EmptyState
- DealCard
- SectionHeader
- BottomNav
- AppHeader
- SearchBar
- SegmentedControl

Do not create one huge UI file.

---

## 4. Buttons

### Button base

All buttons must have:

- `border-radius: 12px`
- `font-size: 14px`
- `font-weight: 650`
- smooth transition 150ms to 200ms
- visible focus state
- disabled state
- loading state if used for async actions

### Primary button

Use for main CTA: post deal, publish deal, create alert, save form.

Style:

- Background: `#1D4ED8`
- Text: `#FFFFFF`
- Border: none
- Height: `44px`
- Padding: `0 18px`
- Shadow: `0 8px 18px rgba(29, 78, 216, 0.20)`

Hover:

- Background: `#1E40AF`
- Transform: `translateY(-1px)`

Active:

- Background: `#1E3A8A`
- Transform: `translateY(0)`

Focus:

- Outline: `3px solid rgba(29, 78, 216, 0.25)`
- Outline-offset: `2px`

Disabled:

- Background: `#CBD5E1`
- Shadow: none
- Cursor: not-allowed

### Secondary button

Use for cancel, secondary actions, open filters.

Style:

- Background: `#FFFFFF`
- Text: `#0B1220`
- Border: `1px solid #E2E8F0`
- Height: `44px`
- Padding: `0 16px`

Hover:

- Background: `#F8FAFC`
- Border-color: `#CBD5E1`

Active:

- Background: `#F1F5F9`

### Ghost button

Use for close, menu actions, small links.

Style:

- Background: transparent
- Color: `#526070`
- Border: none
- Height: `40px`
- Padding: `0 12px`
- Border-radius: `10px`

Hover:

- Background: `#F1F5F9`
- Color: `#0B1220`

### Soft button

Use for gentle CTA, saved state, alert entry.

Style:

- Background: `#EAF2FF`
- Text: `#1D4ED8`
- Border: `1px solid #D8E6FF`
- Height: `42px`
- Padding: `0 16px`

Hover:

- Background: `#DDEBFF`

### Danger button

Use for destructive actions.

Style:

- Background: `#FEF2F2`
- Text: `#DC2626`
- Border: `1px solid #FECACA`
- Height: `42px`
- Padding: `0 16px`

Hover:

- Background: `#FEE2E2`

### Icon button

Use for save, share, close modal, notifications, profile, vote actions.

Style:

- Width: `40px`
- Height: `40px`
- Border-radius: `12px`
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Color: `#526070`
- Display flex center

Hover:

- Background: `#F8FAFC`
- Color: `#0B1220`
- Border-color: `#CBD5E1`

Selected:

- Background: `#EAF2FF`
- Color: `#1D4ED8`
- Border-color: `#BFD7FF`

### Filter chip

Use for filters, categories, cities, discount filters.

Default:

- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Color: `#526070`
- Height: `36px`
- Padding: `0 14px`
- Border-radius: `999px`
- Font-size: `13px`
- Font-weight: `600`

Hover:

- Background: `#F8FAFC`
- Border-color: `#CBD5E1`
- Color: `#0B1220`

Selected:

- Background: `#0B1220`
- Color: `#FFFFFF`
- Border-color: `#0B1220`

---

## 5. Inputs and forms

Create consistent Input, Select, Textarea components.

Input style:

- Height: `46px`
- Background: `#FFFFFF`
- Border: `1px solid #E2E8F0`
- Border-radius: `14px`
- Padding: `0 14px`
- Font-size: `14px`
- Color: `#0B1220`

Placeholder:

- Color: `#A0AEC0`

Focus:

- Border-color: `#1D4ED8`
- Box-shadow: `0 0 0 3px rgba(29, 78, 216, 0.15)`
- Outline: none

Error:

- Border-color: `#DC2626`
- Box-shadow: `0 0 0 3px rgba(220, 38, 38, 0.12)`

Label:

- Font-size: `13px`
- Font-weight: `650`
- Color: `#0B1220`
- Margin-bottom: `8px`

Error text:

- Color: `#DC2626`
- Font-size: `12px`
- Margin-top: `6px`

Helper text:

- Color: `#7A8699`
- Font-size: `12px`

---

## 6. App header

Desktop header:

- Sticky top `0`
- Height `72px`
- Background `rgba(247, 249, 252, 0.88)`
- Backdrop blur `16px`
- Border bottom `1px solid rgba(226, 232, 240, 0.8)`
- High z-index

Layout:

- Max-width `1180px`
- Centered
- Padding `0 32px`
- Flex align center justify between

Left:

- Logo text: `dILz`
- Text color: `#0B1220`
- `IL` accent in `#1D4ED8`
- No emoji

Center:

- Search bar width around `420px`
- Height `44px`
- Radius `999px`
- Placeholder: `Search deals, stores, cities`

Right:

- City selector
- Notifications icon
- Profile button
- Primary `Post deal` button

Mobile header:

- Height `64px`
- Padding `0 16px`
- Left logo
- Right notification icon and profile/menu button
- Search appears under header, not squeezed into it

---

## 7. Mobile bottom navigation

Mobile only. Hide on desktop.

Position:

- Fixed bottom `0`
- Left `0`
- Right `0`
- Height `72px`
- Background `rgba(255, 255, 255, 0.94)`
- Backdrop blur `18px`
- Border top `1px solid #E2E8F0`
- High z-index

Items:

1. Deals
2. Search
3. Post
4. Alerts
5. Profile

Item style:

- Icon above label
- Label font-size `11px`
- Inactive color `#7A8699`
- Active color `#1D4ED8`
- Active icon has soft blue pill background

Post item:

- Circular blue button above nav line
- `48px` by `48px`
- Background `#1D4ED8`
- White plus icon
- Shadow `0 8px 18px rgba(29, 78, 216, 0.25)`

Actions:

- Deals: main feed
- Search: focus/open search
- Post: open post deal modal
- Alerts: open alerts
- Profile: open profile

Add bottom padding to page content so bottom nav does not hide content.

---

## 8. Homepage discovery area

Replace marketing hero with app-like discovery.

Mobile:

- Padding top `16px`
- Headline: `Best deals near you`
- Subheading: `Store promos and community finds across Israel.`
- Search bar below
- City selector below or integrated
- Quick filters in horizontal scroll

Desktop:

- Compact premium discovery panel
- Left text
- Right highlighted deal or “today’s savings” preview module
- Avoid a giant empty hero

Panel style:

- Background `#EAF2FF`
- White cards inside
- Border radius `22px`
- No large gradient

Search bar:

- Height `52px`
- Background `#FFFFFF`
- Border `1px solid #E2E8F0`
- Radius `16px`
- Left search icon
- Optional right filter button

Quick filters:

- Near me
- Ending soon
- 30%+
- Food
- Fashion
- Supermarkets
- Electronics
- Online

---

## 9. Sticky filter bar

Under discovery area.

Style:

- Sticky below header
- Background `rgba(247, 249, 252, 0.92)`
- Backdrop blur
- Border bottom `1px solid #E2E8F0`
- Padding `10px 0`

Mobile:

- Horizontal scroll chips
- First chip: `Filters`
- Selected chips use dark selected state

Desktop:

- City dropdown
- Category chips
- Discount chips
- Sort dropdown

Sort options:

- New
- Ending soon
- Most voted
- Biggest discount

---

## 10. Deal feed

Sections:

1. Best near you
2. Ending soon
3. Biggest drops today
4. Community finds
5. New today

Mobile:

- Featured sections may use horizontal scroll cards
- Main feed vertical

Tablet:

- 2-column grid

Desktop:

- 3-column grid
- Max-width `1180px`

SectionHeader:

- Title left
- Optional subtitle
- `View all` ghost button right

---

## 11. Deal card

Redesign DealCard completely.

Card base:

- Background `#FFFFFF`
- Border `1px solid #E2E8F0`
- Radius `18px`
- Padding `12px`
- Shadow `0 8px 24px rgba(15, 23, 42, 0.06)`
- Transition `180ms ease`
- Cursor pointer if it opens details

Desktop hover:

- Transform `translateY(-3px)`
- Shadow `0 16px 40px rgba(15, 23, 42, 0.10)`
- Border-color `#CBD5E1`

Mobile active:

- Transform `scale(0.99)`

Image:

- Aspect ratio `4 / 3`
- Width `100%`
- Radius `14px`
- Object-fit cover
- Background `#F1F5F9`

Image overlay:

- Top-left discount badge
- Top-right save icon button
- Bottom-left trust label

Discount badge:

- If discount >= 30: background `#15803D`, text white
- If discount < 30: background `#EAF8EF`, text `#15803D`
- Radius `999px`
- Padding `6px 9px`
- Font-size `12px`
- Weight `800`
- Example: `-35%`

Urgency badge:

- If ending soon: background `#FEF2F2`, text `#DC2626`, label `Ends soon`

Trust label:

- Store promo: background `#EAF2FF`, text `#1D4ED8`, label `Store promo`
- Community find: background `#F1F5F9`, text `#526070`, label `Community find`

Card body:

- Margin top `12px`

Store/city row:

- Font size `12px`
- Color `#526070`
- Format: `Shufersal · Raanana`
- Store name bold

Title:

- Font size `16px`
- Weight `700`
- Color `#0B1220`
- Clamp to 2 lines
- Margin top `6px`

Price row:

- Current price: `18px`, weight `800`, color `#0B1220`
- Old price: `13px`, color `#A0AEC0`, strikethrough
- Do not fake discount if unavailable

Meta row:

- Time remaining
- Category
- Online/in-store
- Font size `12px`
- Color `#7A8699`

Actions row:

- Margin top `12px`
- Flex justify between align center

Vote control:

- Pill background `#F1F5F9`
- Radius `999px`
- Height `36px`
- Upvote active: background `#EAF8EF`, color `#15803D`
- Downvote color `#64748B`
- Vote count: `13px`, weight `700`, color `#0B1220`

Right actions:

- Share icon
- `View deal` soft button, height `36px`

No emojis in deal cards.

---

## 12. Deal details page

Mobile:

- Large image on top
- Details below
- Sticky bottom action bar with price and `Open deal` CTA

Desktop:

- Two-column layout
- Left: image/gallery
- Right: details panel

Details panel includes:

- Store name
- City
- Deal title
- Current price
- Old price
- Discount
- Expiration
- Description
- Trust label
- Votes
- Save/share actions

Primary CTA: `Open deal`
Secondary actions: Save, Share, Report

---

## 13. Post deal modal

Make posting a deal feel guided and premium.

Desktop modal:

- Width `640px`
- Background white
- Radius `24px`
- Modal shadow

Mobile:

- Full-screen modal or bottom sheet
- If bottom sheet, top radius `24px`

Header:

- Title: `Post a deal`
- Subtitle: `Share a real deal you found with the community.`
- Close icon button

Stepper with 4 steps:

1. Image
2. Details
3. Location
4. Preview

Stepper style:

- Small numbered circles
- Active circle blue
- Completed circle green
- Hide labels on small mobile

Step 1 Image:

- Upload/drop area
- Background `#F8FAFC`
- Border `1px dashed #CBD5E1`
- Radius `18px`
- Height `220px`
- CTA: `Upload deal image`
- Helper: `Use a clear photo or screenshot.`
- After selection: preview, replace, remove

Step 2 Details:

- Deal title
- Description
- Current price
- Old price optional
- Discount optional
- Category
- Expiration date optional

Step 3 Location:

- Store name
- City
- Online / In-store segmented control
- Deal URL optional
- Address optional

Segmented control:

- Selected: background `#0B1220`, text white
- Inactive: background white, border `#E2E8F0`

Step 4 Preview:

- Show exact DealCard preview

Footer:

- Left: Back ghost/secondary button
- Right: Continue/Publish primary button

Validation:

- Inline errors only
- No browser alert popups
- Disable Continue until current step is valid
- Publish uses loading state

Success toast:

- Title: `Deal published`
- Subtitle: `Thanks for helping the community save.`

---

## 14. Alerts UI

Main message:

`Tell Dilz what you’re looking for. We’ll notify you when a matching deal appears.`

Alert card:

- Background white
- Border `#E2E8F0`
- Radius `18px`
- Padding `16px`

Alert creation modal:

- Title: `Create an alert`
- Subtitle: `Get notified when a matching deal appears.`

Fields:

- Keyword
- City
- Category
- Minimum discount
- Online / In-store
- Store optional

Minimum discount chips:

- Any
- 10%+
- 20%+
- 30%+
- 50%+

Alert preview example:

`Deals matching “Nike” in Raanana, 30%+`

Empty state:

- Title: `No alerts yet`
- Text: `Create your first alert and Dilz will watch for matching deals.`
- CTA: `Create alert`

Alert list item:

- Title: keyword or category
- Subtitle: city + discount + online/in-store
- Active badge
- Edit button
- Delete button

---

## 15. Notifications panel

Desktop:

- Right-side drawer
- Width `400px`

Mobile:

- Bottom sheet or full screen

Header:

- Title: `Notifications`
- Ghost button: `Mark all as read`

Group by:

- Today
- Earlier

Notification item:

- Unread dot
- Deal image thumbnail `48x48`
- Title
- Reason, for example: `Matches your Raanana alert`
- Time
- Click opens deal

Unread item:

- Background `#F3F7FF`

Empty state:

- Title: `Nothing new`
- Text: `Your matching deals will appear here.`

---

## 16. Profile tab

Sections:

1. Account
2. Saved deals
3. My alerts
4. My posted deals
5. Settings
6. Sign out

Use clean list rows:

- White background
- Border bottom `#E2E8F0`
- Icon left
- Label
- Chevron right

---

## 17. Menus

Dropdown style:

- Background white
- Border `1px solid #E2E8F0`
- Radius `16px`
- Shadow `0 16px 40px rgba(15, 23, 42, 0.10)`
- Padding `6px`
- Min width `220px`

Menu item:

- Height `40px`
- Radius `10px`
- Padding `0 10px`
- Flex align center
- Gap `10px`
- Font size `14px`
- Text `#0B1220`

Hover:

- Background `#F1F5F9`

Danger item:

- Text `#DC2626`
- Hover background `#FEF2F2`

---

## 18. Toasts

Position:

- Mobile: bottom above nav
- Desktop: top right

Style:

- Background `#0B1220`
- Color white
- Radius `14px`
- Padding `12px 14px`
- Shadow `0 16px 40px rgba(15, 23, 42, 0.22)`

Success icon:

- Green dot or simple check
- No emoji

Error toast:

- Background `#DC2626`

Duration:

- 3 seconds

---

## 19. Loading and empty states

Use skeleton loaders instead of ugly feed spinners.

Skeleton:

- Background `#E2E8F0`
- Subtle shimmer
- Radius matches actual element

Deal card skeleton:

- Image skeleton
- Title lines
- Price line
- Action row

Empty state style:

- Centered card
- Max width `360px`
- Soft icon container
- Title
- Description
- CTA if relevant

No deals:

- Title: `No deals found`
- Text: `Try changing your city, category, or discount filters.`
- CTA: `Clear filters`

No saved deals:

- Title: `No saved deals yet`
- Text: `Save deals you want to check later.`

No alerts:

- Title: `No alerts yet`
- Text: `Create an alert and Dilz will notify you when matching deals appear.`
- CTA: `Create alert`

---

## 20. Micro-interactions

Cards:

- Hover lift on desktop
- Press scale on mobile

Buttons:

- Primary hover lift only
- Active returns to normal

Modals:

- Fade backdrop
- Slide up on mobile
- Scale/fade on desktop

Bottom nav:

- Active icon pill transition

Save action:

- Icon changes state
- Small scale animation

Vote action:

- Selected state visible immediately
- Count updates smoothly

Notification badge:

- Small pulse only when new unread item appears

Transitions:

- 150ms to 220ms ease
- Avoid slow animations

---

## 21. Copy rules

Use short, confident copy.

Use:

- `Best deals near you`
- `Store promos and community finds across Israel.`
- `Ending soon`
- `Biggest drops`
- `Community finds`
- `New today`
- `Create alert`
- `Post a deal`
- `View deal`
- `Save`
- `Share`
- `Store promo`
- `Community find`
- `Verified store promo`
- `Matches your alert`

Avoid:

- `Amazing deals!!!`
- `Hot deal!!!`
- `Unbelievable`
- `Don’t miss out!!!`
- Emojis in core UI
- Excessive exclamation marks

---

## 22. Responsive behavior

Mobile first.

Breakpoints:

- Mobile: default
- Tablet: `768px+`
- Desktop: `1024px+`
- Wide: `1280px+`

Mobile:

- Single column
- Bottom nav
- Sticky horizontal filters
- Post deal through bottom nav/floating action
- Modals full-screen or bottom sheet

Tablet:

- 2-column deal grid

Desktop:

- Max width `1180px`
- 3-column deal grid
- Full top nav
- Horizontal filters
- No bottom nav

---

## 23. Accessibility

Requirements:

- All buttons have accessible labels
- Icon-only buttons have `aria-label`
- Focus states visible
- Keyboard navigation works in modals
- Modal traps focus
- ESC closes modal
- Color contrast is readable
- Tap targets minimum `40px`
- Form errors are connected to inputs where possible

---

## 24. Implementation order

Implement in this exact order:

1. Audit current UI files and data flow.
2. Add global design tokens.
3. Create reusable UI primitives.
4. Redesign AppHeader.
5. Redesign BottomNav.
6. Redesign homepage discovery area.
7. Redesign search and sticky filters.
8. Redesign DealCard.
9. Redesign feed sections.
10. Redesign deal details page.
11. Redesign post deal modal.
12. Redesign alerts UI.
13. Redesign notifications UI.
14. Redesign profile tab.
15. Add skeleton loading states.
16. Add empty states.
17. Add micro-interactions.
18. Verify responsive behavior.
19. Run lint/build.
20. Fix all issues.

---

## 25. Coding rules

Do not create a disconnected mockup.

Do not replace real data with fake data except fallback placeholders or skeletons.

Do not remove API calls.

Do not remove authentication logic.

Do not rename backend fields unless absolutely necessary.

Do not break existing routes.

Avoid unnecessary dependencies.

If Tailwind is used, extend Tailwind config with the design tokens.

If CSS modules/global CSS are used, create clean CSS variables.

Prefer components over repeated markup.

Keep files readable and maintainable.

---

## 26. Final expected result

Dilz should feel:

- Premium
- Mobile-first
- Clean
- Trustworthy
- Fast
- Local
- Modern
- Much more polished than a generic AI-generated app

The wow effect should come from:

- Beautiful deal cards
- Premium spacing
- Strong mobile navigation
- Clean filters
- Smooth modals
- Clear visual hierarchy
- Consistent design system
- Useful micro-interactions

After implementation, provide:

1. List of changed files
2. Summary of the new design system
3. Summary of redesigned screens/components
4. Confirmation that lint/build was run
5. Remaining recommendations
6. Run a Push Git Automatically

Do not give me a strategy document. Implement this directly in the codebase. Work file by file, preserve all existing functionality, and only summarize after the implementation is complete.
Do not ask me for anything, change all the file you want automatically. Be very careful of not breaking anything.

Finally, Claude already started to do some modifications but didn't finish. This is his last comment: "Les 3 premiers fichiers sont faits (globals.css, _document.js, _app.js). Il reste index.js, deal/[id].js, auth.js, profil.js". Check his work. If nothing else needs to be done then don't do anything. If things need to be ameliorated, do it.