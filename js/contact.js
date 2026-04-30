// contact.js — Contact & Support page
import { updateNavAuth } from './auth.js';

const ALLOWED_DOMAIN = 'am.students.amrita.edu';

document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();

  const form    = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  const submitBtn  = document.getElementById('contact-submit');
  const submitText = document.getElementById('contact-submit-text');

  // ── Helper: show/hide field errors ─────────────────────────────────────
  function setError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('show', show);
  }

  // ── Validate ───────────────────────────────────────────────────────────
  function validate() {
    let ok = true;

    const name  = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim().toLowerCase();
    const issue = document.getElementById('issue-type').value;
    const prio  = document.querySelector('input[name="priority"]:checked');
    const msg   = document.getElementById('contact-message').value.trim();

    setError('err-contact-name',    !name);
    setError('err-contact-email',   !email || !email.endsWith('@' + ALLOWED_DOMAIN));
    setError('err-issue-type',      !issue);
    setError('err-priority',        !prio);
    setError('err-contact-message', msg.length < 20);

    if (!name)                                     ok = false;
    if (!email || !email.endsWith('@' + ALLOWED_DOMAIN)) ok = false;
    if (!issue)                                    ok = false;
    if (!prio)                                     ok = false;
    if (msg.length < 20)                           ok = false;

    return ok;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Button loading state
    submitBtn.disabled       = true;
    submitText.textContent   = 'Sending…';

    // Simulate async send (swap for real backend / Firestore write if desired)
    await new Promise(r => setTimeout(r, 1400));

    // Store in localStorage as a simple audit log
    const ticket = {
      name:     document.getElementById('contact-name').value.trim(),
      email:    document.getElementById('contact-email').value.trim(),
      issue:    document.getElementById('issue-type').value,
      priority: document.querySelector('input[name="priority"]:checked').value,
      message:  document.getElementById('contact-message').value.trim(),
      followup: document.getElementById('opt-followup').checked,
      anon:     document.getElementById('opt-anonymous').checked,
      ts:       new Date().toISOString()
    };

    const tickets = JSON.parse(localStorage.getItem('ss-support-tickets') || '[]');
    tickets.push(ticket);
    localStorage.setItem('ss-support-tickets', JSON.stringify(tickets));

    form.style.display    = 'none';
    success.classList.add('show');
  });

  // ── Live validation on blur ─────────────────────────────────────────────
  document.getElementById('contact-name').addEventListener('blur', function () {
    setError('err-contact-name', !this.value.trim());
  });
  document.getElementById('contact-email').addEventListener('blur', function () {
    const v = this.value.trim().toLowerCase();
    setError('err-contact-email', !v || !v.endsWith('@' + ALLOWED_DOMAIN));
  });
  document.getElementById('issue-type').addEventListener('change', function () {
    setError('err-issue-type', !this.value);
  });
  document.getElementById('contact-message').addEventListener('input', function () {
    setError('err-contact-message', this.value.trim().length < 20);
  });
});
