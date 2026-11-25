/**
 * tests/unit/fs004-inventory-products.test.js
 * Fitur FS-004: Manajemen Inventaris Produk - Status Stok, Image Resolver, & API CRUD (RQ-004)
 * Test Doubles: Stub (Supabase Products Query), Spy (stock_logs.insert), Fake (in-memory product)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateStockStatus } = require('../../lib/inventory-evaluator');
const { resolveGadgetImage, GADGET_IMAGES } = require('../../lib/image-helper');
const {
  createMockReq,
  createResponseRecorder,
  createQueryBuilderStub,
  createSpy,
  loadApiWithSupabaseDouble
} = require('../helpers/test-doubles');

test('FS-004: Manajemen Inventaris Produk (Evaluator, Image Helper, & Products API)', async (t) => {
  await t.test('[Positif] evaluateStockStatus & resolveGadgetImage mengklasifikasikan stok dan gambar produk akurat', () => {
    // Arrange & Act
    const inStock = evaluateStockStatus(50, 10);
    const lowStock = evaluateStockStatus(5, 10);
    const outStock = evaluateStockStatus(0, 10);
    const invalidStock = evaluateStockStatus(-5, 10);
    const imgIphone = resolveGadgetImage('iPhone 15 Pro Max', 'Apple', 'Smartphones');

    // Assert
    assert.deepEqual(inStock, { label: 'In Stock', class: 'badge-success' });
    assert.deepEqual(lowStock, { label: 'Low Stock', class: 'badge-warning' });
    assert.deepEqual(outStock, { label: 'Out of Stock', class: 'badge-critical' });
    assert.deepEqual(invalidStock, { label: 'Invalid Stock', class: 'badge-error' });
    assert.equal(imgIphone, GADGET_IMAGES.iphone_pro);
  });

  await t.test('[Positif] POST /api/products menyimpan produk baru & mencatat audit ke stock_logs (Spy Insert)', async () => {
    // Arrange
    const stockLogInsertSpy = createSpy(async () => ({ error: null }));
    const createdRow = { id: 'prod-99', sku: 'APL-IP15-256', name: 'iPhone 15 Pro', stock: 12 };

    const productsHandler = loadApiWithSupabaseDouble('api/products/index.js', {
      from: (table) => {
        if (table === 'products') {
          return createQueryBuilderStub({ result: { data: createdRow, error: null } });
        }
        if (table === 'stock_logs') {
          return { insert: stockLogInsertSpy };
        }
      }
    });

    const req = createMockReq('POST', {
      body: { sku: 'APL-IP15-256', name: 'iPhone 15 Pro', brand: 'Apple', category: 'Smartphones', price_sell: 21000000, stock: 12 }
    });
    const res = createResponseRecorder();

    // Act
    await productsHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.sku, 'APL-IP15-256');
    assert.equal(stockLogInsertSpy.callCount(), 1);
    assert.equal(stockLogInsertSpy.calledWith(0)[0].change_type, 'initial');
    assert.equal(stockLogInsertSpy.calledWith(0)[0].qty_after, 12);
  });

  await t.test('[Negatif] POST /api/products mengembalikan HTTP 400 bila sku/name/price_sell kosong', async () => {
    // Arrange
    const productsHandler = loadApiWithSupabaseDouble('api/products/index.js', { from: () => createQueryBuilderStub() });
    const req = createMockReq('POST', { body: { sku: '', name: 'Tanpa SKU' } });
    const res = createResponseRecorder();

    // Act
    await productsHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'sku, name, price_sell are required');
  });

  await t.test('[Positif] PUT /api/products/:id restock menambah stok dan mencatat log restock (Stub & Spy)', async () => {
    // Arrange
    const stockLogSpy = createSpy(async () => ({ error: null }));
    let selectPhase = true;

    const productIdHandler = loadApiWithSupabaseDouble('api/products/[id]/index.js', {
      from: (table) => {
        if (table === 'products') {
          return createQueryBuilderStub({
            result: () => {
              if (selectPhase) {
                selectPhase = false;
                return { data: { stock: 10 }, error: null };
              }
              return { data: { id: 'p-1', stock: 25 }, error: null };
            }
          });
        }
        return { insert: stockLogSpy };
      }
    });

    const req = createMockReq('PUT', { query: { id: 'p-1' }, body: { stock_add: 15 } });
    const res = createResponseRecorder();

    // Act
    await productIdHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.stock, 25);
    assert.equal(stockLogSpy.callCount(), 1);
    assert.equal(stockLogSpy.calledWith(0)[0].qty_before, 10);
    assert.equal(stockLogSpy.calledWith(0)[0].qty_after, 25);
  });

  await t.test('[Positif] GET /api/products filter status & DELETE /api/products/:id soft delete berfungsi benar', async () => {
    // Arrange
    const productsHandler = loadApiWithSupabaseDouble('api/products/index.js', {
      from: () => createQueryBuilderStub({
        result: { data: [{ id: 'p-low', name: 'Kabel C', stock: 4 }], error: null, count: 1 }
      })
    });
    const listRes = createResponseRecorder();

    const productIdHandler = loadApiWithSupabaseDouble('api/products/[id]/index.js', {
      from: () => createQueryBuilderStub({ result: { data: null, error: null } })
    });
    const delRes = createResponseRecorder();

    // Act
    await productsHandler(createMockReq('GET', { query: { status: 'low_stock', search: 'Kabel', page: '1', limit: '10' } }), listRes);
    await productIdHandler(createMockReq('DELETE', { query: { id: 'p-low' } }), delRes);

    // Assert
    assert.equal(listRes.statusCode, 200);
    assert.equal(listRes.body.products.length, 1);
    assert.equal(listRes.body.pagination.pages, 1);
    assert.equal(delRes.statusCode, 200);
    assert.equal(delRes.body.success, true);
  });
});
