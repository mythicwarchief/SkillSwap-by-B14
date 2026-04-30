import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ── College email validation ───────────────────────────────────────────────
const ALLOWED_DOMAIN = 'am.students.amrita.edu';

export function isCollegeEmail(email) {
  return email.trim().toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}

// ── Admin access list ─────────────────────────────────────────────────────
// Add your college email(s) here to grant admin access
const ADMIN_EMAILS = [
  'shreyas8infinity@gmail.com',
];

export function isAdmin(email) {
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes((email || '').toLowerCase());
}

// ── Auth guard — redirects to login if not signed in ──────────────────────
export function requireAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (user) {
        resolve(user);
      } else {
        window.location.href = 'login.html';
        reject();
      }
    });
  });
}

// ── Update navbar auth state ──────────────────────────────────────────────
export function updateNavAuth() {
  onAuthStateChanged(auth, user => {
    const navEl = document.getElementById('auth-nav');
    if (!navEl) return;

    if (user) {
      const email       = user.email;
      const emailPrefix = email.split('@')[0];
      const displayName = localStorage.getItem(`ss-username-${email}`) || emailPrefix;
      // Initials: last dot-separated segment of the prefix, first 2 chars
      const parts    = emailPrefix.split('.');
      const initials = (parts[parts.length - 1] || emailPrefix).slice(0, 2).toUpperCase();
      const storedAvatar = localStorage.getItem(`ss-avatar-${email}`);

      navEl.innerHTML = `
        <div class="nav-avatar-wrap" id="nav-avatar-wrap">
          <div class="nav-avatar" id="nav-avatar"
               role="button" tabindex="0" aria-label="Profile menu" title="${displayName}">
            ${storedAvatar
              ? `<img src="${storedAvatar}" alt="Profile">`
              : `<span id="nav-avatar-initials">${initials}</span>`
            }
          </div>
          <div class="nav-dropdown" id="nav-dropdown" role="menu">
            <div class="nav-dropdown-header">
              <span id="nav-username">${displayName}</span>
              <span class="nav-dropdown-email">${email}</span>
            </div>
            <a href="dashboard.html" class="nav-dropdown-item">🏠 Dashboard</a>
            ${isAdmin(email) ? `<a href="admin.html" class="nav-dropdown-item">⚙️ Admin Panel</a>` : ''}
            <button class="nav-dropdown-item nav-dropdown-logout" id="logout-btn">🚪 Logout</button>
          </div>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
      });

      // Toggle open/closed on click (for touch / keyboard)
      document.getElementById('nav-avatar').addEventListener('click', () => {
        document.getElementById('nav-avatar-wrap').classList.toggle('open');
      });

    } else {
      navEl.innerHTML = `<a href="login.html" class="btn btn-sm">Sign In</a>`;
    }
  });
}

export { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
