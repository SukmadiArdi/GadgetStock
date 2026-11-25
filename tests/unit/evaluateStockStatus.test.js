const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateStockStatus } = require('../../lib/inventory-evaluator');

test('White-Box Testing: evaluateStockStatus (FS-004)', async (t) => {
  await t.test('TC-01: In Stock (stock = 50, minStock = 10) - Covers S1, S2, S3, S4, S5, S6, S11 & Branches B1, B3', () => {
    const res = evaluateStockStatus(50, 10);
    assert.deepEqual(res, {
      label: 'In Stock',
      class: 'badge-success'
    });
  });

  await t.test('TC-02: Low Stock (stock = 5, minStock = 10) - Covers S1, S2, S3, S4, S7, S9, S11 & Branches B1, B4, B6', () => {
    const res = evaluateStockStatus(5, 10);
    assert.deepEqual(res, {
      label: 'Low Stock',
      class: 'badge-warning'
    });
  });

  await t.test('TC-03: Out of Stock (stock = 0, minStock = 10) - Covers S1, S2, S3, S4, S7, S8, S11 & Branches B1, B4, B5', () => {
    const res = evaluateStockStatus(0, 10);
    assert.deepEqual(res, {
      label: 'Out of Stock',
      class: 'badge-critical'
    });
  });

  await t.test('TC-04: Invalid Stock (stock = -5, minStock = 10) - Covers S1, S2, S3, S10, S11 & Branch B2', () => {
    const res = evaluateStockStatus(-5, 10);
    assert.deepEqual(res, {
      label: 'Invalid Stock',
      class: 'badge-error'
    });
  });
});
