import test from 'node:test';
import assert from 'node:assert/strict';
import { HOT_VOTES_THRESHOLD, POINTS_PER_HOT_DEAL, hotDealPoints, pointsToTier } from '../lib/points.js';

test('hotDealPoints awards points only once a deal reaches the threshold', () => {
  assert.equal(hotDealPoints(HOT_VOTES_THRESHOLD - 1), 0);
  assert.equal(hotDealPoints(HOT_VOTES_THRESHOLD), POINTS_PER_HOT_DEAL);
  assert.equal(hotDealPoints(HOT_VOTES_THRESHOLD + 5), POINTS_PER_HOT_DEAL);
  assert.equal(hotDealPoints(0), 0);
});

for (const [points, expected] of [
  [0, 'bronze'],
  [49, 'bronze'],
  [50, 'silver'],
  [149, 'silver'],
  [150, 'gold'],
  [499, 'gold'],
  [500, 'platinum'],
  [10000, 'platinum'],
]) {
  test(`pointsToTier(${points}) is ${expected}`, () => {
    assert.equal(pointsToTier(points), expected);
  });
}

test('pointsToTier defensively treats invalid input as zero points', () => {
  assert.equal(pointsToTier(null), 'bronze');
  assert.equal(pointsToTier(undefined), 'bronze');
  assert.equal(pointsToTier(NaN), 'bronze');
  assert.equal(pointsToTier(-10), 'bronze');
});
