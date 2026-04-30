import {
  auth,
  isCollegeEmail,
  isAdmin,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from './auth.js';

// ── If already logged in, skip login page ─────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) window.location.replace('dashboard.html');
});

// ── Tab switching ──────────────────────────────────────────────────────────
const tabLogin    = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin   = document.getElementById('login-form');
const formReg     = document.getElementById('register-form');

function showTab(tab) {
  tabLogin.classList.toggle('active', tab === 'login');
  tabRegister.classList.toggle('active', tab === 'register');
  formLogin.classList.toggle('active', tab === 'login');
  formReg.classList.toggle('active', tab === 'register');
}

tabLogin.addEventListener('click',    () => showTab('login'));
tabRegister.addEventListener('click', () => showTab('register'));
document.getElementById('switch-to-register').addEventListener('click', () => showTab('register'));
document.getElementById('switch-to-login').addEventListener('click',    () => showTab('login'));

// ── Helpers ────────────────────────────────────────────────────────────────
function showErr(id, show, msg = '') {
  const el = document.getElementById(id);
  el.classList.toggle('show', show);
  if (msg) el.textContent = msg;
}

// ── Firebase error messages ────────────────────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/too-many-requests':    'Too many attempts. Please try again later.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ── Login form ─────────────────────────────────────────────────────────────
formLogin.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  let valid = true;
  showErr('err-login-email',    !email);    if (!email)    valid = false;
  showErr('err-login-password', !password); if (!password) valid = false;
  showErr('err-login-general',  false);
  if (!valid) return;

  const btn = document.getElementById('login-submit');
  document.getElementById('login-submit-text').textContent = 'Signing in…';
  btn.disabled = true;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace('dashboard.html');
  } catch (err) {
    showErr('err-login-general', true, friendlyError(err.code));
    btn.disabled = false;
    document.getElementById('login-submit-text').textContent = 'Sign In →';
  }
});

// ── Register form ──────────────────────────────────────────────────────────
formReg.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  let valid = true;
  // Allow college emails OR admin email(s)
  const emailOk = isCollegeEmail(email) || isAdmin(email);
  showErr('err-reg-email',    !emailOk);             if (!emailOk)            valid = false;
  showErr('err-reg-password', password.length < 6);  if (password.length < 6) valid = false;
  showErr('err-reg-confirm',  password !== confirm);  if (password !== confirm) valid = false;
  showErr('err-reg-general',  false);
  if (!valid) return;

  const btn = document.getElementById('reg-submit');
  document.getElementById('reg-submit-text').textContent = 'Creating account…';
  btn.disabled = true;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.replace('dashboard.html');
  } catch (err) {
    showErr('err-reg-general', true, friendlyError(err.code));
    btn.disabled = false;
    document.getElementById('reg-submit-text').textContent = 'Create Account →';
  }
});
