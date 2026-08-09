// Pure feed-composition logic, extracted so pinned/ad ordering can be unit
// tested independently of React.
//
// Rules (issue #31):
// - Pinned deals (is_pinned) always render first, in whatever relative order
//   they arrive in — regardless of the active sort. A deal that is both
//   pinned and an ad is treated as pinned (the "and not pinned" qualifier on
//   the ad rule).
// - Ad deals (is_ad, not pinned) are inserted every 8 regular deals, so the
//   first ad can only appear after at least 8 regular deals — never at
//   position 1, even with zero pinned deals.
// - Ads are supplied as a separate pool (fetched independent of sort/paging,
//   since a fresh ad with no votes would never surface under "hot" sort) and
//   cycle if there are more ad slots than ads. Each composed item gets a
//   stable, unique _feedKey since a cycled ad can appear more than once.

const AD_INTERVAL = 8;

export function composeFeedWithPinnedAndAds(deals = [], ads = []) {
  const pinned = deals.filter((deal) => deal.is_pinned);
  const regular = deals.filter((deal) => !deal.is_pinned && !deal.is_ad);

  const composed = pinned.map((deal) => ({ ...deal, _feedKey: `deal-${deal.id}` }));

  if (!ads.length) {
    regular.forEach((deal) => composed.push({ ...deal, _feedKey: `deal-${deal.id}` }));
    return composed;
  }

  let adSlot = 0;
  regular.forEach((deal, index) => {
    composed.push({ ...deal, _feedKey: `deal-${deal.id}` });
    if ((index + 1) % AD_INTERVAL === 0) {
      const ad = ads[adSlot % ads.length];
      composed.push({ ...ad, is_ad: true, _feedKey: `ad-${ad.id}-slot-${adSlot}` });
      adSlot += 1;
    }
  });

  return composed;
}
