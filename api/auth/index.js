const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Forgot Password ────────────────────────────────────────────────
// Akun GadgetStock memakai email sintetis (<employee-id>@gadgetstock.local),
// sehingga link reset lewat email tidak akan pernah sampai ke pengguna.
// Identitas diverifikasi dengan Employee ID + Nama Lengkap, lalu diterbitkan
// token reset bertanda tangan HMAC yang hanya berlaku sebentar.
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESET_TOKEN_TTL = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const verifyAttempts = new Map();

function signResetToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + RESET_TOKEN_TTL })).toString('base64url');
  const signature = crypto.createHmac('sha256', RESET_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readResetToken(token) {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = crypto.createHmac('sha256', RESET_SECRET).update(payload).digest('base64url');
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data.uid;
  } catch (_) {
    return null;
  }
}

// auth-js v2 tidak menyediakan getUserByEmail, jadi user dicari lewat listUsers.
async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find(u => (u.email || '').toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) return null;
  }
  return null;
}

// Nama lengkap adalah satu-satunya rahasia pada alur ini, jadi percobaan
// verifikasi dibatasi agar tidak bisa ditebak berulang kali.
function isRateLimited(key) {
  const entry = verifyAttempts.get(key);
  return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_VERIFY_ATTEMPTS;
}

function recordAttempt(key) {
  const entry = verifyAttempts.get(key);
  if (!entry || entry.resetAt <= Date.now()) {
    verifyAttempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW });
  } else {
    entry.count++;
  }
}

const normalizeName = (value) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, employee_id, password, full_name, user_id, new_password, token } = req.body;

  // Handle change_password separately — does not need employee_id/password
  if (action === 'change_password') {
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // Lupa password — langkah 1: verifikasi Employee ID + Nama Lengkap
  if (action === 'forgot_password') {
    if (!employee_id || !full_name) {
      return res.status(400).json({ error: 'Employee ID dan Nama Lengkap wajib diisi' });
    }

    const targetId = employee_id.trim().toUpperCase();
    const targetEmail = `${targetId.toLowerCase()}@gadgetstock.local`;

    if (isRateLimited(targetEmail)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan gagal. Coba lagi beberapa saat.' });
    }

    try {
      const user = await findUserByEmail(targetEmail);

      let registeredName = user?.user_metadata?.full_name || null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile?.full_name) registeredName = profile.full_name;
      }

      if (!user || normalizeName(registeredName) !== normalizeName(full_name)) {
        recordAttempt(targetEmail);
        return res.status(400).json({ error: 'Employee ID atau Nama Lengkap tidak cocok dengan data pendaftaran' });
      }

      verifyAttempts.delete(targetEmail);
      return res.status(200).json({
        success: true,
        employee_id: targetId,
        full_name: registeredName,
        reset_token: signResetToken(user.id),
        expires_in: Math.floor(RESET_TOKEN_TTL / 1000)
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      return res.status(500).json({ error: 'Gagal memproses permintaan reset password' });
    }
  }

  // Lupa password — langkah 2: simpan password baru memakai token reset
  if (action === 'reset_password') {
    if (!token) return res.status(400).json({ error: 'Token reset wajib diisi' });
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const userId = readResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Token reset tidak valid atau sudah kedaluwarsa. Ulangi verifikasi.' });
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password: new_password });
      if (error) throw error;
      return res.status(200).json({
        success: true,
        message: 'Password berhasil diperbarui. Silakan login dengan password baru.'
      });
    } catch (err) {
      console.error('Reset password error:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // For login/signup: employee_id and password are required
  if (!employee_id || !password) {
    return res.status(400).json({ error: 'Employee ID and password are required' });
  }

  // Format ID
  const empId = employee_id.trim().toUpperCase();
  const email = `${empId.toLowerCase()}@gadgetstock.local`;

  try {
    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Fetch profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      return res.status(200).json({ user: data.user, profile, session: data.session });
    } 
    
    else if (action === 'signup') {
      if (!full_name) return res.status(400).json({ error: 'Full name is required for signup' });
      
      // Verify Employee ID format (GS-EMP-xxx, GS-SPV-xxx, or GS-ADM-xxx)
      if (!empId.startsWith('GS-EMP-') && !empId.startsWith('GS-SPV-') && !empId.startsWith('GS-ADM-')) {
        return res.status(400).json({ error: 'Invalid Employee ID. Must start with GS-EMP-, GS-SPV-, or GS-ADM-' });
      }

      let role = 'cashier';
      if (empId.startsWith('GS-SPV-')) {
        role = 'manager';
      } else if (empId.startsWith('GS-ADM-')) {
        role = 'admin';
      }

      // Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, role, employee_id: empId }
        }
      });
      if (error) throw error;

      // Note: Because we use service_role, signUp might auto-confirm if email confirmations are disabled.
      // But just in case, we return success.
      return res.status(201).json({ message: 'Signup successful. You can now login.', user: data.user });
    }

    else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('Auth API Error:', err);
    return res.status(400).json({ error: err.message });
  }
};
