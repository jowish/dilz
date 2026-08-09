import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = async (...parts) => (await readFile(path.join(process.cwd(), ...parts), 'utf8')).replace(/\r\n/g, '\n');

const [dealCard, css] = await Promise.all([
  read('components', 'deals', 'DealCard.js'),
  read('styles', 'globals.css'),
]);

// Issue #33: #31's server-side rejection (403) worked, but the vote button
// still rendered and was clickable on ad deals in the feed — the optimistic
// UI fired even though the server would reject it. Regex-on-source can't
// truly "render" the component (this repo has no JSX test pipeline and
// react-dom isn't installed in this environment — see the PR description),
// so these assertions go further than a loose substring match: they check
// there is exactly one vote-pill in the file and that its only occurrence is
// nested inside the `!isAd` guard, not merely that both strings appear
// somewhere in the file (which is what let the previous, looser style of
// check miss the shape of the actual bug).

test('the vote pill has exactly one render site in DealCard.js, and it is nested inside the !isAd guard', () => {
  const voteMatches = dealCard.match(/dilz-vote-pill--combined/g) || [];
  assert.equal(voteMatches.length, 1, 'expected exactly one vote-pill render site');

  const guardIndex = dealCard.indexOf("{!isAd && (\n          <div className=\"dilz-deal-card__actions\"");
  const voteIndex = dealCard.indexOf('dilz-vote-pill--combined');
  assert.ok(guardIndex > -1, 'the actions block must be guarded by !isAd');
  assert.ok(voteIndex > guardIndex, 'the vote pill must appear after the !isAd guard opens');

  // The guard must actually close after the vote pill (not e.g. an unrelated
  // early-closing paren that leaves the pill unguarded) — the next closing of
  // that specific conditional block comes right before "</div>\n      <CopyToast".
  const closeIndex = dealCard.indexOf('</div>\n      <CopyToast', voteIndex);
  assert.ok(closeIndex > voteIndex, 'the guarded block must close after the vote pill');
});

test('onVote is only ever wired inside the guarded actions block — no second, unguarded vote handler', () => {
  const onVoteMatches = dealCard.match(/onVote\(deal\.id,/g) || [];
  assert.equal(onVoteMatches.length, 2, 'expected exactly the hot and cold vote calls');
  const guardIndex = dealCard.indexOf('{!isAd && (');
  for (const match of dealCard.matchAll(/onVote\(deal\.id,/g)) {
    assert.ok(match.index > guardIndex, 'every onVote call must be inside the !isAd guard');
  }
});

test('comment count and save button are still absent for an ad deal (previously implemented, re-verified here)', () => {
  assert.match(dealCard, /const commentCount = isAd \? 0 :/);
  assert.match(dealCard, /const renderSaveButton = \(\) => \(onSave && !isAd\)/);
});

test('the sponsored indicator is a small, low-weight tag — not the loud .dilz-badge component reused elsewhere on the card', () => {
  assert.match(dealCard, /isAd \? <span className="dilz-deal-card__sponsored-tag">\{text\.sponsored\}<\/span> : renderSaveButton\(\)/);

  const badgeMatch = css.match(/\.dilz-badge \{[^}]*height:\s*(\d+)px[^}]*font-weight:\s*(\d+)/s);
  const tagMatch = css.match(/\.dilz-deal-card__sponsored-tag \{[^}]*height:\s*(\d+)px[^}]*font-weight:\s*(\d+)/s);
  assert.ok(badgeMatch && tagMatch, 'expected both .dilz-badge and .dilz-deal-card__sponsored-tag to declare height/font-weight');
  assert.ok(Number(tagMatch[1]) < Number(badgeMatch[1]), 'sponsored tag must be visually smaller than a regular badge');
  assert.ok(Number(tagMatch[2]) < Number(badgeMatch[2]), 'sponsored tag must be a lighter font-weight than a regular badge');
});

test('the old, more prominent approach (bold text replacing the author line) is gone', () => {
  assert.doesNotMatch(dealCard, /const authorName = isAd \? text\.sponsored/);
});
