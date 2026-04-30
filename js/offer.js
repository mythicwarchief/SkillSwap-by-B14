import { db } from './firebase-config.js';
import { requireAuth, updateNavAuth } from './auth.js';
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ── Auth guard — get the logged-in user's email automatically ──────────────
const currentUser = await requireAuth();
updateNavAuth();

const email = currentUser.email; // always comes from Firebase Auth

const form          = document.getElementById('offer-form');
const submitBtn     = document.getElementById('submit-btn');
const submitText    = document.getElementById('submit-text');
const successBanner = document.getElementById('success-banner');

// ── Validation helpers ──────────────────────────────────────────────────────
function showErr(id, show) {
  document.getElementById(id).classList.toggle('show', show);
}
function val(id) { return document.getElementById(id).value.trim(); }
function getChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
}

// ── Submit ──────────────────────────────────────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();

  const name         = val('name');
  const skillTitle   = val('skillTitle');
  const category     = val('category');
  const description  = val('description');
  const availability = getChecked('availability');
  const mode         = (document.querySelector('input[name="mode"]:checked') || {}).value || '';

  // Validate (no email check needed — sourced from auth)
  let valid = true;
  showErr('err-name',         !name);                      if (!name)                valid = false;
  showErr('err-skillTitle',   !skillTitle);                 if (!skillTitle)          valid = false;
  showErr('err-category',     !category);                   if (!category)            valid = false;
  showErr('err-description',  description.length < 20);     if (description.length < 20) valid = false;
  showErr('err-availability', availability.length === 0);   if (!availability.length) valid = false;
  showErr('err-mode',         !mode);                       if (!mode)                valid = false;

  if (!valid) return;

  submitBtn.disabled = true;
  submitText.textContent = 'Submitting…';

  try {
    await addDoc(collection(db, 'skills'), {
      name, email, skillTitle, category, description, availability, mode,
      timestamp: serverTimestamp()
    });

    form.reset();
    form.querySelectorAll('.check-item, .radio-item').forEach(el => el.classList.remove('selected'));
    form.style.display = 'none';
    successBanner.classList.add('show');

  } catch (err) {
    console.error('Firestore error:', err);
    alert('Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitText.textContent = 'List My Skill →';
  }
});
