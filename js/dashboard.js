// dashboard.js — User Profile / Dashboard
import { requireAuth, updateNavAuth } from './auth.js';
import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

updateNavAuth();

// ── Helpers ───────────────────────────────────────────────────────────────
function getInitials(email) {
  const name = email.split('@')[0];
  const parts = name.split('.');
  const last = parts[parts.length - 1] || name;
  return last.slice(0, 2).toUpperCase();
}

function buildActivityItem(icon, text, time, dotClass) {
  return `
    <div class="activity-item animate-in">
      <span class="activity-dot ${dotClass}"></span>
      <div>
        <p class="activity-text">${icon} ${text}</p>
        <span class="activity-time">${time}</span>
      </div>
    </div>
  `;
}

function timeSince(ts) {
  if (!ts) return 'Recently';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ── Render skill rows ─────────────────────────────────────────────────────
function renderActivityList(containerId, docs, emptyMsg, emptyLink, emptyLinkText, titleField) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (docs.length === 0) {
    el.innerHTML = `<div class="activity-empty"><span>📭</span><p>${emptyMsg} <a href="${emptyLink}">${emptyLinkText} →</a></p></div>`;
    return;
  }
  el.innerHTML = docs.map(d => {
    const data = d.data();
    const title = data[titleField] || 'Untitled';
    const cat   = data.category || '';
    const time  = timeSince(data.timestamp);
    const badgeClass = cat === 'Technical' ? 'badge-technical'
                     : cat === 'Creative'  ? 'badge-creative'
                     : cat === 'Academic'  ? 'badge-academic'
                     : '';
    return `
      <div class="activity-row animate-in">
        <div>
          <span class="activity-row-title">${title}</span>
          ${cat ? `<span class="badge ${badgeClass}" style="margin-left:8px;">${cat}</span>` : ''}
        </div>
        <span class="activity-time">${time}</span>
      </div>
    `;
  }).join('');
}

// ── Apply avatar from localStorage ────────────────────────────────────────
function applyStoredAvatar(email) {
  const stored = localStorage.getItem(`ss-avatar-${email}`);
  const img    = document.getElementById('avatar-img');
  const span   = document.getElementById('avatar-initials');
  if (stored) {
    img.src = stored;
    img.style.display = 'block';
    span.style.display = 'none';
  } else {
    img.style.display = 'none';
    span.style.display = 'block';
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
requireAuth().then(async (user) => {
  const email    = user.email;
  const fallback = email.split('@')[0];        // raw email prefix
  const initials = getInitials(email);

  // Load stored display name (falls back to email prefix)
  const storedName = localStorage.getItem(`ss-username-${email}`) || fallback;

  // ── Populate static profile fields ─────────────────────────────────────
  document.getElementById('dashboard-greeting').textContent = `Welcome back, ${storedName} 👋`;
  document.getElementById('profile-name').textContent       = storedName;
  document.getElementById('profile-email').textContent      = email;
  document.getElementById('avatar-initials').textContent    = initials;

  // Apply stored avatar if any
  applyStoredAvatar(email);

  // ── Avatar upload ───────────────────────────────────────────────────────
  document.getElementById('avatar-upload').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    // Warn if file is very large (> 2 MB localStorage may reject it)
    if (file.size > 2 * 1024 * 1024) {
      alert('Please choose a photo smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        localStorage.setItem(`ss-avatar-${email}`, e.target.result);
        applyStoredAvatar(email);
        // Sync the mini navbar avatar too
        const navAv = document.getElementById('nav-avatar');
        if (navAv) navAv.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
      } catch {
        alert('Could not save photo — storage quota exceeded. Try a smaller image.');
      }
    };
    reader.readAsDataURL(file);
  });

  // ── Username editing ────────────────────────────────────────────────────
  const editBtn        = document.getElementById('edit-username-btn');
  const editWrap       = document.getElementById('username-edit-wrap');
  const usernameInput  = document.getElementById('username-input');
  const saveBtn        = document.getElementById('save-username-btn');
  const cancelBtn      = document.getElementById('cancel-username-btn');
  const nameEl         = document.getElementById('profile-name');
  const greetingEl     = document.getElementById('dashboard-greeting');

  function openEdit() {
    usernameInput.value = nameEl.textContent;
    editWrap.style.display = 'block';
    editBtn.style.display  = 'none';
    usernameInput.focus();
    usernameInput.select();
  }

  function closeEdit() {
    editWrap.style.display = 'none';
    editBtn.style.display  = 'inline-flex';
  }

  function saveUsername() {
    const newName = usernameInput.value.trim();
    if (!newName) { usernameInput.focus(); return; }
    localStorage.setItem(`ss-username-${email}`, newName);
    nameEl.textContent     = newName;
    greetingEl.textContent = `Welcome back, ${newName} 👋`;
    // Live-update the navbar greeting without a page reload
    const navSpan = document.getElementById('nav-username');
    if (navSpan) navSpan.textContent = `👋 ${newName}`;
    closeEdit();
  }

  editBtn.addEventListener('click', openEdit);
  saveBtn.addEventListener('click', saveUsername);
  cancelBtn.addEventListener('click', closeEdit);
  // Save on Enter, cancel on Escape
  usernameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); saveUsername(); }
    if (e.key === 'Escape') { e.preventDefault(); closeEdit(); }
  });

  // ── Fetch Firestore stats ───────────────────────────────────────────────
  try {
    const offeredQ  = query(collection(db, 'skills'),   where('email', '==', email));
    const requestedQ= query(collection(db, 'requests'), where('email', '==', email));

    const [offeredSnap, requestedSnap] = await Promise.all([
      getDocs(offeredQ),
      getDocs(requestedQ)
    ]);

    const offeredDocs   = offeredSnap.docs;
    const requestedDocs = requestedSnap.docs;

    document.getElementById('stat-offered').textContent   = offeredDocs.length;
    document.getElementById('stat-requested').textContent = requestedDocs.length;

    const msgs = JSON.parse(localStorage.getItem('ss-messages') || '{}');
    document.getElementById('stat-connections').textContent = Object.keys(msgs).length;

    renderActivityList('offered-list',   offeredDocs,   'No skills offered yet.',   'offer.html',   'Offer one now',   'skillTitle');
    renderActivityList('requested-list', requestedDocs, 'No skills requested yet.', 'request.html', 'Request one now', 'skillNeeded');

    // Activity feed
    const feed = document.getElementById('activity-feed');
    if (feed) {
      let html = buildActivityItem('🎉', 'Welcome to SkillSwap! Your profile is active.', 'Always', 'dot-green');
      if (offeredDocs.length > 0) {
        const last = offeredDocs[offeredDocs.length - 1].data();
        html += buildActivityItem('🎯', `Skill listed: "${last.skillTitle || 'Untitled'}"`, timeSince(last.timestamp), 'dot-yellow');
      }
      if (requestedDocs.length > 0) {
        const last = requestedDocs[requestedDocs.length - 1].data();
        html += buildActivityItem('📋', `Skill requested: "${last.skillNeeded || 'Untitled'}"`, timeSince(last.timestamp), 'dot-blue');
      }
      feed.innerHTML = html;
    }

  } catch (err) {
    console.warn('Firestore stats unavailable — showing defaults.', err);
  }

}).catch(() => {
  // requireAuth redirects to login.html automatically
});
