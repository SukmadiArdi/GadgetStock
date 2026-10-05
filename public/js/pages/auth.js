import { AuthAPI } from '../api.js';
import State from '../state.js';
import { showToast } from '../utils.js';

let mode = 'login';   // 'login' | 'register'
let resetToken = null; // token sementara dari verifikasi lupa password

window.togglePassword = function(inputId = 'f-password', iconId = 'pw-icon') {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  const toggleBtn = input.closest('.auth-input-group')?.querySelector('.auth-pw-toggle');
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = 'visibility_off';
    toggleBtn?.setAttribute('aria-pressed', 'true');
    input.setAttribute('autocomplete', 'off');
  } else {
    input.type = 'password';
    icon.textContent = 'visibility';
    toggleBtn?.setAttribute('aria-pressed', 'false');
    input.setAttribute('autocomplete', 'current-password');
  }
};

function setMode(next) {
  mode = next;
  const isLogin = mode === 'login';

  document.getElementById('auth-title').textContent         = isLogin ? 'Staff Login'        : 'Buat Akun Baru';
  document.getElementById('auth-subtitle').textContent      = isLogin ? 'Masukkan Employee ID Anda untuk melanjutkan' : 'Daftarkan Employee ID baru Anda';
  document.getElementById('auth-btn-icon').textContent      = isLogin ? 'login'               : 'person_add';
  document.getElementById('auth-btn-text').textContent      = isLogin ? 'Sign In'             : 'Daftar';
  document.getElementById('auth-header-icon').textContent   = isLogin ? 'lock_person'         : 'person_add';
  document.getElementById('auth-toggle-text').textContent   = isLogin ? 'Belum punya akun?'   : 'Sudah punya akun?';
  document.getElementById('toggle-auth-btn').textContent    = isLogin ? 'Daftar di sini'      : 'Masuk di sini';
  document.getElementById('name-group').style.display       = isLogin ? 'none'                : 'block';
  document.getElementById('forgot-link').style.display      = isLogin ? 'block'               : 'none';

  if (!isLogin) document.getElementById('f-fullname').setAttribute('required', 'true');
  else document.getElementById('f-fullname').removeAttribute('required');
}

window.toggleMode = function() {
  setMode(mode === 'login' ? 'register' : 'login');
};

window.handleAuth = async function(e) {
  e.preventDefault();
  const isLogin = mode === 'login';
  const btn     = document.getElementById('auth-btn');
  const btnIcon = document.getElementById('auth-btn-icon');
  const btnText = document.getElementById('auth-btn-text');
  const origText = isLogin ? 'Sign In' : 'Daftar';
  btn.disabled  = true;
  btnIcon.textContent = 'hourglass_empty';
  btnIcon.classList.add('spinning');
  btnText.textContent = isLogin ? 'Memproses...' : 'Mendaftarkan...';

  try {
    const empId    = document.getElementById('f-empid').value.trim();
    const password = document.getElementById('f-password').value;

    if (isLogin) {
      const res = await AuthAPI.login(empId, password);
      State.setUser(res.user, res.profile);
      showToast('Login berhasil!', 'success');
      setTimeout(() => navigate('/dashboard'), 500);
    } else {
      const name = document.getElementById('f-fullname').value.trim();
      const res  = await AuthAPI.signup(empId, password, name);
      showToast(res.message, 'success');
      setMode('login');
      document.getElementById('f-empid').value    = empId;
      document.getElementById('f-password').value = '';
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnIcon.classList.remove('spinning');
    btnIcon.textContent = mode === 'login' ? 'login' : 'person_add';
    btnText.textContent = origText;
  }
};

// === Lupa Password ==============================================

function showForgotStep(step) {
  document.getElementById('forgot-step-verify').style.display = step === 'verify' ? 'block' : 'none';
  document.getElementById('forgot-step-reset').style.display  = step === 'reset'  ? 'block' : 'none';
}

window.enterForgotMode = function() {
  const empId = document.getElementById('f-empid').value.trim();
  if (empId) document.getElementById('fg-empid').value = empId;

  document.getElementById('auth-page').classList.add('forgot-mode');
  showForgotStep('verify');
  document.getElementById('fg-empid').focus();
};

window.exitForgotMode = function() {
  resetToken = null;
  document.getElementById('auth-page').classList.remove('forgot-mode');
  document.getElementById('forgot-verify-form').reset();
  document.getElementById('forgot-reset-form').reset();
  showForgotStep('verify');
};

window.handleForgotVerify = async function(e) {
  e.preventDefault();
  const btn  = document.getElementById('fg-verify-btn');
  const icon = document.getElementById('fg-verify-icon');
  const text = document.getElementById('fg-verify-text');
  btn.disabled   = true;
  icon.textContent = 'hourglass_empty';
  text.textContent = 'Memverifikasi...';

  const empId = document.getElementById('fg-empid').value.trim();
  const name  = document.getElementById('fg-fullname').value.trim();

  try {
    const res = await AuthAPI.forgotPassword(empId, name);
    resetToken = res.reset_token;
    document.getElementById('fg-reset-identity').textContent = `${res.full_name} · ${res.employee_id}`;
    showForgotStep('reset');
    showToast('Identitas terverifikasi. Silakan buat password baru.', 'success');
    document.getElementById('fg-pass1').focus();
  } catch (err) {
    showToast(err.message, 'error', 4000);
  } finally {
    btn.disabled   = false;
    icon.textContent = 'verified_user';
    text.textContent = 'Verifikasi';
  }
};

window.handleForgotReset = async function(e) {
  e.preventDefault();

  if (!resetToken) {
    showForgotStep('verify');
    return showToast('Sesi reset tidak ditemukan, verifikasi ulang identitas Anda', 'error', 4000);
  }

  const pass1 = document.getElementById('fg-pass1').value;
  const pass2 = document.getElementById('fg-pass2').value;
  if (pass1.length < 6) return showToast('Password minimal 6 karakter', 'error');
  if (pass1 !== pass2)  return showToast('Konfirmasi password tidak sama', 'error');

  const btn  = document.getElementById('fg-reset-btn');
  const icon = document.getElementById('fg-reset-icon');
  const text = document.getElementById('fg-reset-text');
  btn.disabled   = true;
  icon.textContent = 'hourglass_empty';
  text.textContent = 'Menyimpan...';

  const empId = document.getElementById('fg-empid').value.trim();

  try {
    const res = await AuthAPI.resetPassword(resetToken, pass1);
    resetToken = null;
    exitForgotMode();
    document.getElementById('f-empid').value = empId;
    document.getElementById('f-password').focus();
    showToast(res.message, 'success', 4000);
  } catch (err) {
    showToast(err.message, 'error', 4000);
    // Token ditolak server (kedaluwarsa / tidak valid) → ulangi dari verifikasi
    if (/tidak valid|kedaluwarsa/i.test(err.message)) {
      resetToken = null;
      showForgotStep('verify');
    }
  } finally {
    btn.disabled   = false;
    icon.textContent = 'save';
    text.textContent = 'Simpan Password';
  }
};

// UX: Enter di Employee ID pindah ke kolom Password (init saat halaman dimuat via router)
window.addEventListener('page:loaded', () => {
  const empInput = document.getElementById('f-empid');
  if (!empInput || empInput.dataset.enterBound === '1') return;
  empInput.dataset.enterBound = '1';
  empInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('f-password')?.focus();
    }
  });
});

window.enterGuestMode = function() {
  State.setGuestMode();
  navigate('/dashboard');
};
