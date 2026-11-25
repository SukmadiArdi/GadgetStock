/**
 * tests/unit/fs002-register.test.js
 * Fitur FS-002: Pendaftaran Akun Pengguna / Register & Validasi Password (RQ-002)
 * Test Doubles: Mock (Supabase signUp), Stub (updateUserById), Dummy (request metadata)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  createSpy,
  loadApiWithSupabaseDouble
} = require('../helpers/test-doubles');

test('FS-002: Register Staff & Validasi Role/Password (api/auth)', async (t) => {
  await t.test('[Positif] Signup GS-ADM-002 memetakan role admin & mengirim payload ke Supabase (Mock signUp)', async () => {
    // Arrange
    const signUpMock = createSpy(async ({ email, password, options }) => ({
      data: { user: { id: 'u-new', email, user_metadata: options.data } },
      error: null
    }));
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: { signUp: signUpMock },
      from: () => ({})
    });
    const req = createMockReq('POST', {
      body: { action: 'signup', employee_id: 'GS-ADM-002', password: 'PasswordKuat123', full_name: 'Rizky Admin' }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 201);
    assert.equal(signUpMock.callCount(), 1);
    const [callArg] = signUpMock.calledWith(0);
    assert.equal(callArg.email, 'gs-adm-002@gadgetstock.local');
    assert.equal(callArg.options.data.role, 'admin');
  });

  await t.test('[Positif] Signup GS-EMP-010 memetakan role cashier (Mock signUp)', async () => {
    // Arrange
    const signUpMock = createSpy(async ({ email, options }) => ({
      data: { user: { id: 'u-emp', email, user_metadata: options.data } },
      error: null
    }));
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: { signUp: signUpMock },
      from: () => ({})
    });
    const req = createMockReq('POST', {
      body: { action: 'signup', employee_id: 'GS-EMP-010', password: 'Kasir123', full_name: 'Siti Kasir' }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 201);
    assert.equal(signUpMock.calledWith(0)[0].options.data.role, 'cashier');
  });

  await t.test('[Negatif] Signup gagal jika format Employee ID tidak diawali GS-EMP-/GS-SPV-/GS-ADM-', async () => {
    // Arrange
    const signUpMock = createSpy();
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: { signUp: signUpMock },
      from: () => ({})
    });
    const req = createMockReq('POST', {
      body: { action: 'signup', employee_id: 'INVALID-999', password: 'Password123', full_name: 'Anon' }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Invalid Employee ID/i);
    assert.equal(signUpMock.callCount(), 0);
  });

  await t.test('[Negatif] Change password ditolak jika panjang password kurang dari 6 karakter', async () => {
    // Arrange
    const updateStub = createSpy(async () => ({ error: null }));
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: { admin: { updateUserById: updateStub } },
      from: () => ({})
    });
    const req = createMockReq('POST', {
      body: { action: 'change_password', user_id: 'u-1', new_password: '12345' }
    });
    const res = createResponseRecorder();

    // Act
    await authHandler(req, res);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Password must be at least 6 characters');
    assert.equal(updateStub.callCount(), 0);
  });
});
