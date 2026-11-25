/**
 * tests/unit/fs007-transaction-history.test.js
 * Fitur FS-007: Riwayat Transaksi Penjualan, Filter, Pagination, & Formatting (RQ-008)
 * Test Doubles: Stub (Supabase Query Result & PGRST103), Spy (Filter & Range Operations), Fake (Rows)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  createQueryBuilderStub,
  loadApiWithSupabaseDouble,
  FakeLocalStorage
} = require('../helpers/test-doubles');

test('FS-007: Riwayat Transaksi & Pagination (api/transactions + utils.js)', async (t) => {
  await t.test('[Positif] GET /api/transactions menerapkan filter tanggal, metode, search, dan menghitung pagination', async () => {
    // Arrange
    let capturedOps = [];
    const fakeRows = [
      { id: 't-1', txn_number: 'TXN-001', total: 500000, payment_method: 'qris', status: 'completed' }
    ];

    const txnHandler = loadApiWithSupabaseDouble('api/transactions/index.js', {
      from: () => {
        const qb = createQueryBuilderStub({
          result: (_, ops) => {
            capturedOps = ops;
            return { data: fakeRows, error: null, count: 45 };
          }
        });
        return qb;
      }
    });

    const req = createMockReq('GET', {
      query: { page: '2', limit: '10', method: 'qris', status: 'completed', date: '2026-11-25', search: 'TXN' }
    });
    const res = createResponseRecorder();

    // Act
    await txnHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.transactions.length, 1);
    assert.deepEqual(res.body.pagination, { total: 45, page: 2, limit: 10, pages: 5 });
    assert.ok(capturedOps.some(op => op[0] === 'range' && op[1] === 10 && op[2] === 19));
    assert.ok(capturedOps.some(op => op[0] === 'eq' && op[1] === 'payment_method' && op[2] === 'qris'));
  });

  await t.test('[Negatif] GET /api/transactions mengembalikan array kosong aman saat Supabase error PGRST103', async () => {
    // Arrange
    const txnHandler = loadApiWithSupabaseDouble('api/transactions/index.js', {
      from: () => createQueryBuilderStub({
        result: { data: null, error: { code: 'PGRST103', message: 'Range Not Satisfiable' }, count: 10 }
      })
    });
    const req = createMockReq('GET', { query: { page: '99', limit: '10' } });
    const res = createResponseRecorder();

    // Act
    await txnHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.transactions, []);
    assert.equal(res.body.pagination.page, 1);
  });

  await t.test('[Positif & Negatif] formatRupiah menangani angka valid maupun null/NaN dengan aman', async () => {
    // Arrange
    globalThis.localStorage = new FakeLocalStorage();
    const { formatRupiah, truncate } = await import('../../public/js/utils.js');

    // Act & Assert
    assert.equal(formatRupiah(150000), 'Rp 150.000');
    assert.equal(formatRupiah(null), 'Rp 0');
    assert.equal(formatRupiah(Number.NaN), 'Rp 0');
    assert.equal(truncate('GadgetStock Inventory Management System', 11), 'GadgetStock...');
  });
});
