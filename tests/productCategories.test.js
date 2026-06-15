const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getProductCategoryLabel,
  inferProductCategory,
} = require('../lib/productCategories');

test('classifies common Hebrew supermarket product names', () => {
  assert.equal(inferProductCategory('חלב טרי 3%'), 'dairy_eggs');
  assert.equal(inferProductCategory('מיץ תפוזים טבעי'), 'beverages');
  assert.equal(inferProductCategory('שמפו לשיער יבש'), 'personal_care');
  assert.equal(inferProductCategory('עגבניות שרי'), 'fruits_vegetables');
});

test('classifies English names and falls back to other', () => {
  assert.equal(inferProductCategory('Frozen pizza family size'), 'frozen');
  assert.equal(inferProductCategory('Laundry detergent'), 'household');
  assert.equal(inferProductCategory('Unrecognized product'), 'other');
});

test('provides category labels in supported interface languages', () => {
  assert.equal(getProductCategoryLabel('beverages', 'en'), 'Drinks');
  assert.equal(getProductCategoryLabel('beverages', 'he'), 'משקאות');
});
