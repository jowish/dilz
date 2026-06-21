import test from 'node:test';
import assert from 'node:assert/strict';
import { clearDealCity, dealImageSlots } from '../lib/postDealForm.js';

test('the first selected photo occupies the primary upload slot', () => {
  const images = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  assert.deepEqual(dealImageSlots(images), {
    primary: images[0],
    thumbnails: [images[1], images[2]],
  });
});

test('removing the primary photo promotes the next photo', () => {
  const remaining = [{ id: 'two' }, { id: 'three' }];
  assert.equal(dealImageSlots(remaining).primary.id, 'two');
  assert.deepEqual(dealImageSlots(remaining).thumbnails.map((image) => image.id), ['three']);
});

test('image slots tolerate invalid input and enforce the three-photo limit', () => {
  assert.deepEqual(dealImageSlots(null), { primary: null, thumbnails: [] });
  assert.deepEqual(dealImageSlots([1, 2, 3, 4]), { primary: 1, thumbnails: [2, 3] });
});

test('clearing a selected city returns to All Israel without stale coordinates', () => {
  assert.deepEqual(clearDealCity({ ville: 'Tel Aviv', latitude: 32.08, longitude: 34.78, adresse: 'Dizengoff 1' }), {
    ville: '',
    latitude: null,
    longitude: null,
    adresse: 'Dizengoff 1',
  });
});
