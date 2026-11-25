/**
 * tests/unit/fs006-checkout-payment.test.js
 * Fitur FS-006: Checkout, Kalkulasi PPN, Kembalian Tunai, & Transaksi RPC (RQ-007)
 * Test Doubles: Mock (Supabase RPC create_sales_transaction), Stub (settings), Dummy (notes)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  createQueryBuilderStub,
  createSpy,
  loadApiWithSupabaseDouble,
  FakeLocalStorage
} = require('../helpers/test-doubles');

test('FS-006: Checkout & Validasi Pembayaran Tunai (utils.js & api/transactions)', async (t) => {
  await t.test('[Positif] calcCartTotals menghitung subtotal, PPN 11%, dan grand total secara akurat', async () => {
    // Arrange
    globalThis.localStorage = new FakeLocalStorage();
    const { calcCartTotals } = await import('../../public/js/utils.js');
    const items = [
      { price: 100000, qty: 2 },
      { price: 50000, qty: 1 }
    ];

    // Act
    const totals = calcCartTotals(items, 0.11);

    // Assert
    assert.equal(totals.subtotal, 250000);
    assert.equal(totals.tax, 27500);
    assert.equal(totals.total, 277500);
  });

  await t.test('[Positif] POST /api/transactions memproses pembayaran tunai & menghitung kembalian via Mock RPC', async () => {
    // Arrange
    const rpcMock = createSpy(async () => ({ data: 'txn-uuid-101', error: null }));
    const createdTxn = { id: 'txn-uuid-101', txn_number: 'TXN-2026-001', total: 111000, change_amount: 39000 };

    const txnHandler = loadApiWithSupabaseDouble('api/transactions/index.js', {
      from: (table) => {
        if (table === 'settings') {
          return createQueryBuilderStub({ result: { data: [{ key: 'tax_rate', value: '0.11' }], error: null } });
        }
        return createQueryBuilderStub({ result: { data: createdTxn, error: null } });
      },
      rpc: rpcMock
    });

    const req = createMockReq('POST', {
      body: {
        items: [{ product_id: 'p-1', product_name: 'Mouse Wireless', product_sku: 'MS-01', quantity: 1, unit_price: 100000 }],
        payment_method: 'cash',
        cash_received: 150000,
        customer_name: 'Budi',
        notes: 'Dummy test note'
      }
    });
    const res = createResponseRecorder();

    // Act
    await txnHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 201);
    assert.equal(rpcMock.callCount(), 1);
    const [rpcName, rpcParams] = rpcMock.calledWith(0);
    assert.equal(rpcName, 'create_sales_transaction');
    assert.equal(rpcParams.p_subtotal, 100000);
    assert.equal(rpcParams.p_tax_amount, 11000);
    assert.equal(rpcParams.p_total, 111000);
    assert.equal(rpcParams.p_change_amount, 39000);
  });

  await t.test('[Negatif] POST /api/transactions menolak keranjang kosong (400) dan menangani error stok RPC', async () => {
    // Arrange
    const txnHandler = loadApiWithSupabaseDouble('api/transactions/index.js', {
      from: () => createQueryBuilderStub({ result: { data: [], error: null } }),
      rpc: async () => ({ data: null, error: { message: 'Insufficient stock for SKU MS-01' } })
    });

    const resEmpty = createResponseRecorder();
    await txnHandler(createMockReq('POST', { body: { items: [], payment_method: 'cash' } }), resEmpty);
    assert.equal(resEmpty.statusCode, 400);
    assert.equal(resEmpty.body.error, 'items are required');

    // Act: trigger insufficient stock RPC error
    const resStockErr = createResponseRecorder();
    await txnHandler(createMockReq('POST', {
      body: {
        items: [{ product_id: 'p-1', product_name: 'Mouse', product_sku: 'MS-01', quantity: 99, unit_price: 100000 }],
        payment_method: 'cash',
        cash_received: 15000000
      }
    }), resStockErr);

    // Assert
    assert.equal(resStockErr.statusCode, 400);
    assert.match(resStockErr.body.error, /Insufficient stock/i);
  });
});
