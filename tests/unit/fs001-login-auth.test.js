/**
 * tests/unit/fs001-login-auth.test.js
 * Fitur FS-001: Login, Autentikasi Pengguna, & RBAC Access Control (RQ-001)
 * Test Doubles: Stub (Supabase Auth), Fake (FakeLocalStorage), Dummy (dummyLogger)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  createQueryBuilderStub,
  loadApiWithSupabaseDouble,
  FakeLocalStorage,
  dummyLogger
} = require('../helpers/test-doubles');

test('FS-001: Login & RBAC Authentication (api/auth + utils.js)', async (t) => {
  await t.test('[Positif] Login berhasil untuk Administrator dengan Employee ID valid (Stub Supabase)', async () => {
    // Arrange
    const fakeProfile = { id: 'adm-1', full_name: 'Achmad Ardi Sukmadi', role: 'admin', employee_id: 'GS-ADM-001' };
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: {
        signInWithPassword: async ({ email, password }) => {
          assert.equal(email, 'gs-adm-001@gadgetstock.local');
          assert.equal(password, 'Admin@2026!');
          return { data: { user: { id: 'adm-1', email }, session: { access_token: 'jwt-stub' } }, error: null };
        }
      },
      from: () => createQueryBuilderStub({ result: { data: fakeProfile, error: null } })
    });
    const req = createMockReq('POST', {
      body: { action: 'login', employee_id: ' gs-adm-001 ', password: 'Admin@2026!', meta: dummyLogger }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.profile.role, 'admin');
    assert.equal(res.body.session.access_token, 'jwt-stub');
  });

  await t.test('[Negatif] Login gagal saat Employee ID atau Password kosong (400 Bad Request)', async () => {
    // Arrange
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', { auth: {}, from: () => ({}) });
    const req = createMockReq('POST', { body: { action: 'login', employee_id: '', password: '' } });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Employee ID and password are required');
  });

  await t.test('[Negatif] Login ditolak saat Supabase mengembalikan Invalid login credentials (Stub Error)', async () => {
    // Arrange
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: {
        signInWithPassword: async () => ({ data: null, error: new Error('Invalid login credentials') })
      },
      from: () => createQueryBuilderStub()
    });
    const req = createMockReq('POST', {
      body: { action: 'login', employee_id: 'GS-ADM-001', password: 'wrong-password' }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Invalid login credentials/i);
  });

  await t.test('[Positif & Negatif] RBAC canAccess membedakan Admin vs Cashier memakai FakeLocalStorage', async () => {
    // Arrange
    globalThis.localStorage = new FakeLocalStorage();
    const { canAccess, isManagerOrAbove } = await import('../../public/js/utils.js');
    const adminUser = { id: 'adm-1', role: 'admin' };
    const cashierUser = { id: 'csh-1', role: 'cashier' };

    // Act
    const adminReports = canAccess('reports', adminUser);
    const cashierPos = canAccess('pos', cashierUser);
    const cashierReports = canAccess('reports', cashierUser);
    const anonAccess = canAccess('pos', null);

    // Assert
    assert.equal(adminReports, true);
    assert.equal(cashierPos, true);
    assert.equal(cashierReports, false);
    assert.equal(anonAccess, false);
    assert.equal(isManagerOrAbove(adminUser), true);
    assert.equal(isManagerOrAbove(cashierUser), false);
  });
});
