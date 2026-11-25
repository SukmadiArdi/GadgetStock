/**
 * tests/unit/fs008-store-settings.test.js
 * Fitur FS-008: Konfigurasi Pengaturan Toko, Tarif Pajak PPN, & State Settings (RQ-009)
 * Test Doubles: Fake (FakeSettingsRepository & FakeLocalStorage), Mock (fetchMock), Spy (State.on('settings'))
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  FakeSettingsRepository,
  FakeLocalStorage,
  createFetchMock,
  createSpy,
  loadApiWithSupabaseDouble
} = require('../helpers/test-doubles');

test('FS-008: Konfigurasi Pengaturan Toko & Pajak PPN (api/settings + state.js)', async (t) => {
  await t.test('[Positif] GET & POST /api/settings membaca dan menyimpan pengaturan via FakeSettingsRepository', async () => {
    // Arrange
    const fakeRepo = new FakeSettingsRepository([
      { key: 'store_name', value: 'GadgetStock Malang' },
      { key: 'tax_rate', value: '0.11' }
    ]);

    const settingsHandler = loadApiWithSupabaseDouble('api/settings/index.js', {
      from: () => ({
        select: async () => ({ data: fakeRepo.selectAll(), error: null }),
        upsert: async ({ key, value }) => fakeRepo.upsert(key, value)
      })
    });

    // Act 1: POST update
    const postRes = createResponseRecorder();
    await settingsHandler(createMockReq('POST', {
      body: { tax_rate: 0.12, receipt_footer: 'Terima kasih telah berbelanja!' }
    }), postRes);

    // Act 2: GET verify
    const getRes = createResponseRecorder();
    await settingsHandler(createMockReq('GET'), getRes);

    // Assert
    assert.equal(postRes.statusCode, 200);
    assert.equal(postRes.body.success, true);
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.body.store_name, 'GadgetStock Malang');
    assert.equal(getRes.body.tax_rate, '0.12');
    assert.equal(getRes.body.receipt_footer, 'Terima kasih telah berbelanja!');
  });

  await t.test('[Negatif] /api/settings mengembalikan 405 Method Not Allowed untuk method DELETE', async () => {
    // Arrange
    const settingsHandler = loadApiWithSupabaseDouble('api/settings/index.js', { from: () => ({}) });
    const res = createResponseRecorder();

    // Act
    await settingsHandler(createMockReq('DELETE'), res);

    // Assert
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error, 'Method not allowed');
  });

  await t.test('[Positif] State.updateSettings menyinkronkan taxRate ke Mock fetch & memicu Spy subscriber', async () => {
    // Arrange
    globalThis.localStorage = new FakeLocalStorage();
    const fetchMock = createFetchMock(async () => ({
      ok: true,
      json: async () => ({ store_name: 'GadgetStock', tax_rate: '0.11' })
    }));
    globalThis.fetch = fetchMock;

    const mod = await import(`../../public/js/state.js?t=${Date.now()}-${Math.random()}`);
    const State = mod.default;
    State.currentUser = { id: 'adm-1', role: 'admin', name: 'Achmad Ardi Sukmadi' };

    const settingsSpy = createSpy();
    State.on('settings', settingsSpy);

    // Act
    await State.updateSettings({ taxRate: 0.12, lowStockThreshold: 15 });

    // Assert
    assert.equal(State.settings.taxRate, 0.12);
    assert.equal(State.settings.lowStockThreshold, 15);
    assert.equal(settingsSpy.callCount(), 1);
    const postCall = fetchMock.calls.find(c => c[1]?.method === 'POST');
    assert.ok(postCall);
    assert.equal(postCall[0], '/api/settings');
    assert.deepEqual(JSON.parse(postCall[1].body), { tax_rate: 0.12, low_stock_threshold: 15 });
  });
});
