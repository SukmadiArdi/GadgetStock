/**
 * tests/unit/fs005-pos-cart.test.js
 * Fitur FS-005: Manajemen Keranjang Belanja POS & Validasi Stok (RQ-006)
 * Test Doubles: Fake (FakeLocalStorage), Spy (State.on('cart') listener), Dummy (dummy image_url)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { FakeLocalStorage, createSpy, createFetchMock } = require('../helpers/test-doubles');

test('FS-005: Manajemen Keranjang Belanja POS (public/js/state.js)', async (t) => {
  const productSample = {
    id: 'prod-1',
    name: 'Samsung Galaxy A54 5G',
    sku: 'SAM-A54-128',
    price_sell: 5000000,
    image_url: 'https://dummy.local/phone.png',
    category: 'Smartphones',
    stock: 10
  };

  async function loadFreshState() {
    globalThis.localStorage = new FakeLocalStorage();
    globalThis.fetch = createFetchMock(async () => ({
      ok: true,
      json: async () => ({ tax_rate: '0.11', store_name: 'GadgetStock' })
    }));
    const mod = await import(`../../public/js/state.js?t=${Date.now()}-${Math.random()}`);
    const State = mod.default;
    State.currentUser = { id: 'adm-1', role: 'admin', name: 'Achmad Ardi Sukmadi' };
    State.clearCart();
    return State;
  }

  await t.test('[Positif] addToCart menambah item baru, menyimpan ke FakeLocalStorage, & memicu Spy listener', async () => {
    // Arrange
    const State = await loadFreshState();
    const cartListenerSpy = createSpy();
    State.on('cart', cartListenerSpy);

    // Act
    State.addToCart(productSample, 2);
    State.addToCart(productSample, 3);

    // Assert
    assert.equal(State.cart.length, 1);
    assert.equal(State.cart[0].qty, 5);
    assert.equal(cartListenerSpy.callCount(), 2);
    const saved = JSON.parse(globalThis.localStorage.getItem('gs_cart'));
    assert.equal(saved[0].qty, 5);
  });

  await t.test('[Negatif] updateQty membatasi kuantitas maksimal sesuai stok fisik & menghapus item jika qty <= 0', async () => {
    // Arrange
    const State = await loadFreshState();
    State.addToCart(productSample, 2);

    // Act 1: Coba ubah qty melebihi stok (99 > 10)
    State.updateQty('prod-1', 99);
    const qtyAfterOverflow = State.cart[0].qty;

    // Act 2: Set qty = 0 untuk menghapus item
    State.updateQty('prod-1', 0);

    // Assert
    assert.equal(qtyAfterOverflow, 10);
    assert.equal(State.cart.length, 0);
  });
});
