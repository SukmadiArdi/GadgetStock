import { AuthAPI } from '/js/api.js';
import State from '/js/state.js';
import { showToast } from '/js/utils.js';

let isLogin = true;

window.togglePassword = function() {
  const pwInput = document.getElementById('f-password');
  const pwIcon = document.getElementById('pw-icon');
  const toggleBtn = pwInput.closest('.auth-input-group').querySelector('.auth-pw-toggle');
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    pwIcon.textContent = 'visibility_off';
    toggleBtn?.setAttribute('aria-pressed', 'true');
    pwInput.setAttribute('autocomplete', 'off');
  } else {
    pwInput.type = 'password';
    pwIcon.textContent = 'visibility';
    toggleBtn?.setAttribute('aria-pressed', 'false');
    pwInput.setAttribute('autocomplete', 'current-password');
  }
};

window.toggleMode = function() {
  isLogin = !isLogin;
  document.getElementById('auth-title').textContent         = isLogin ? 'Staff Login'        : 'Buat Akun Baru';
  document.getElementById('auth-subtitle').textContent      = isLogin ? 'Masukkan Employee ID Anda untuk melanjutkan' : 'Daftarkan Employee ID baru Anda';
  document.getElementById('auth-btn-icon').textContent      = isLogin ? 'login'               : 'person_add';
  document.getElementById('auth-btn-text').textContent      = isLogin ? 'Sign In'             : 'Daftar';
  document.getElementById('auth-header-icon').textContent   = isLogin ? 'lock_person'         : 'person_add';
  document.getElementById('auth-toggle-text').textContent   = isLogin ? 'Belum punya akun?'   : 'Sudah punya akun?';
  document.getElementById('toggle-auth-btn').textContent    = isLogin ? 'Daftar di sini'      : 'Masuk di sini';
  document.getElementById('name-group').style.display       = isLogin ? 'none'                : 'block';
  if (!isLogin) document.getElementById('f-fullname').setAttribute('required', 'true');
  else document.getElementById('f-fullname').removeAttribute('required');
};

window.handleAuth = async function(e) {
  e.preventDefault();
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
      toggleMode();
      document.getElementById('f-empid').value    = empId;
      document.getElementById('f-password').value = '';
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btnIcon.classList.remove('spinning');
    btnIcon.textContent = isLogin ? 'login' : 'person_add';
    btnText.textContent = origText;
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
