/**
 * tests/unit/fs003-forgot-password.test.js
 * Fitur FS-003: Pemulihan Kata Sandi, Token HMAC, TTL 10 Menit, & Rate Limit (RQ-003)
 * Test Doubles: Fake (Clock Date.now), Stub (listUsers & profiles), Spy (updateUserById)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockReq,
  createResponseRecorder,
  createQueryBuilderStub,
  createSpy,
  loadApiWithSupabaseDouble
} = require('../helpers/test-doubles');

test('FS-003: Forgot Password & Reset Token TTL (api/auth)', async (t) => {
  await t.test('[Positif] Verifikasi identitas menerbitkan reset_token valid dan berhasil mereset password', async () => {
    // Arrange
    const updateUserSpy = createSpy(async () => ({ error: null }));
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [{ id: 'u-adm-1', email: 'gs-adm-001@gadgetstock.local', user_metadata: { full_name: 'Achmad Ardi Sukmadi' } }] },
            error: null
          }),
          updateUserById: updateUserSpy
        }
      },
      from: () => createQueryBuilderStub({ result: { data: { full_name: 'Achmad Ardi Sukmadi' }, error: null } })
    });

    const verifyReq = createMockReq('POST', {
      body: { action: 'forgot_password', employee_id: 'GS-ADM-001', full_name: '  achmad   ardi sukmadi ' }
    });
    const verifyRes = createResponseRecorder();

    // Act 1: Verifikasi & ambil token
    await authHandler(verifyReq, verifyRes);

    // Assert 1
    assert.equal(verifyRes.statusCode, 200);
    assert.equal(verifyRes.body.expires_in, 600);
    assert.ok(verifyRes.body.reset_token.includes('.'));

    // Act 2: Reset password memakai token yang baru diterbitkan
    const resetReq = createMockReq('POST', {
      body: { action: 'reset_password', token: verifyRes.body.reset_token, new_password: 'NewPassword2026!' }
    });
    const resetRes = createResponseRecorder();
    await authHandler(resetReq, resetRes);

    // Assert 2
    assert.equal(resetRes.statusCode, 200);
    assert.equal(resetRes.body.success, true);
    assert.equal(updateUserSpy.callCount(), 1);
    assert.deepEqual(updateUserSpy.calledWith(0), ['u-adm-1', { password: 'NewPassword2026!' }]);
  });

  await t.test('[Negatif] Token reset ditolak jika sudah kedaluwarsa melewati TTL 10 menit (Fake Clock)', async () => {
    // Arrange
    const realNow = Date.now;
    let fakeTime = 1_700_000_000_000;
    Date.now = () => fakeTime;

    try {
      const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
        auth: {
          admin: {
            listUsers: async () => ({
              data: { users: [{ id: 'u-ttl', email: 'gs-adm-099@gadgetstock.local', user_metadata: { full_name: 'Tester TTL' } }] },
              error: null
            }),
            updateUserById: async () => ({ error: null })
          }
        },
        from: () => createQueryBuilderStub({ result: { data: { full_name: 'Tester TTL' }, error: null } })
      });

      const verifyRes = createResponseRecorder();
      await authHandler(createMockReq('POST', {
        body: { action: 'forgot_password', employee_id: 'GS-ADM-099', full_name: 'Tester TTL' }
      }), verifyRes);

      // Majukan waktu melewati 10 menit (601 detik)
      fakeTime += 601_000;

      const resetRes = createResponseRecorder();
      // Act
      await authHandler(createMockReq('POST', {
        body: { action: 'reset_password', token: verifyRes.body.reset_token, new_password: 'PasswordBaru123' }
      }), resetRes);

      // Assert
      assert.equal(resetRes.statusCode, 400);
      assert.match(resetRes.body.error, /kedaluwarsa|tidak valid/i);
    } finally {
      Date.now = realNow;
    }
  });

  await t.test('[Negatif] Verifikasi forgot_password diblokir (HTTP 429) setelah 5x percobaan gagal', async () => {
    // Arrange
    const authHandler = loadApiWithSupabaseDouble('api/auth/index.js', {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null })
        }
      },
      from: () => createQueryBuilderStub()
    });

    // Act: lakukan 5 kali percobaan gagal
    for (let i = 0; i < 5; i++) {
      const resFail = createResponseRecorder();
      await authHandler(createMockReq('POST', {
        body: { action: 'forgot_password', employee_id: 'GS-EMP-404', full_name: 'Salah Nama' }
      }), resFail);
      assert.equal(resFail.statusCode, 400);
    }

    const resBlocked = createResponseRecorder();
    await authHandler(createMockReq('POST', {
      body: { action: 'forgot_password', employee_id: 'GS-EMP-404', full_name: 'Salah Nama' }
    }), resBlocked);

    // Assert
    assert.equal(resBlocked.statusCode, 429);
    assert.match(resBlocked.body.error, /Terlalu banyak percobaan gagal/i);
  });
});
