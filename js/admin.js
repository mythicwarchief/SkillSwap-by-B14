// admin.js — Admin Panel (Shreyas / platform owner only)
import { requireAuth, updateNavAuth, isAdmin } from './auth.js';
import { db } from './firebase-config.js';
import {
  collection, onSnapshot, deleteDoc, updateDoc,
  doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ── Auth + admin gate ─────────────────────────────────────────────────────
const currentUser = await requireAuth();
updateNavAuth();

const adminContent  = document.getElementById('admin-content');
const accessDenied  = document.getElementById('access-denied');

if (!isAdmin(currentUser.email)) {
  accessDenied.style.display = 'flex';
  throw new Error('Not an admin — access denied.');
}

adminContent.style.display = 'block';

// ── Live data ─────────────────────────────────────────────────────────────
let allOffers   = [];  // { id, ...data }
let allRequests = [];
let activeTab   = 'offers';
let searchQuery = '';

// ── DOM refs ──────────────────────────────────────────────────────────────
const tabOffers     = document.getElementById('tab-offers');
const tabRequests   = document.getElementById('tab-requests');
const offersPanel   = document.getElementById('offers-panel');
const requestsPanel = document.getElementById('requests-panel');
const adminSearch   = document.getElementById('admin-search');
const editModal     = document.getElementById('edit-modal');
const editFields    = document.getElementById('edit-form-fields');
const editTitle     = document.getElementById('edit-modal-title');
const saveEditBtn   = document.getElementById('save-edit-btn');

let editingDoc = null;   // { collection, id, data }

// ── Helpers ───────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

function updateStats() {
  const emails = new Set([
    ...allOffers.map(o => o.email),
    ...allRequests.map(r => r.email)
  ]);
  document.getElementById('stat-total-offers').textContent   = allOffers.length;
  document.getElementById('stat-total-requests').textContent = allRequests.length;
  document.getElementById('stat-total-users').textContent    = emails.size;
  document.getElementById('stat-total-all').textContent      = allOffers.length + allRequests.length;
}

// ── Render table ──────────────────────────────────────────────────────────
function renderTable(items, colName, titleField, bodyField) {
  const panel = colName === 'skills' ? offersPanel : requestsPanel;
  const q = searchQuery.toLowerCase();

  const filtered = q
    ? items.filter(it =>
        (it[titleField] || '').toLowerCase().includes(q) ||
        (it.email || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q))
    : items;

  if (filtered.length === 0) {
    panel.innerHTML = `<div class="admin-empty">
      ${q ? '🔍 No results for "' + esc(q) + '"' : '📭 No entries yet.'}
    </div>`;
    return;
  }

  panel.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Submitted By</th>
          <th>Description</th>
          <th>Posted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(item => `
          <tr>
            <td class="title-cell">${esc(item[titleField] || 'Untitled')}</td>
            <td>${item.category
                  ? `<span class="badge ${badgeClass(item.category)}">${esc(item.category)}</span>`
                  : '—'}</td>
            <td class="email-cell">${esc(item.email || '—')}<br>
                <span style="color:var(--text-muted);font-size:0.72rem;">${esc(item.name || '')}</span>
            </td>
            <td class="desc-cell">${esc(item[bodyField] || '—')}</td>
            <td style="white-space:nowrap;font-size:0.78rem;">${fmtTime(item.timestamp)}</td>
            <td>
              <div class="admin-actions">
                <button class="btn-edit" data-col="${colName}" data-id="${item.id}">✏️ Edit</button>
                <button class="btn-delete" data-col="${colName}" data-id="${item.id}"
                        data-title="${esc(item[titleField] || 'this listing')}">🗑 Delete</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  // Attach action handlers
  panel.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.col, btn.dataset.id, btn.dataset.title));
  });
  panel.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => handleEdit(btn.dataset.col, btn.dataset.id));
  });
}

function badgeClass(cat) {
  return cat === 'Technical' ? 'badge-technical'
       : cat === 'Creative'  ? 'badge-creative'
       : cat === 'Academic'  ? 'badge-academic'
       : '';
}

function render() {
  if (activeTab === 'offers') {
    renderTable(allOffers, 'skills', 'skillTitle', 'description');
  } else {
    renderTable(allRequests, 'requests', 'skillNeeded', 'learningGoal');
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
async function handleDelete(colName, docId, title) {
  if (!confirm(`Delete "${title}"?\n\nThis cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, colName, docId));
    // onSnapshot will automatically refresh the list
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────
function handleEdit(colName, docId) {
  const items = colName === 'skills' ? allOffers : allRequests;
  const item  = items.find(i => i.id === docId);
  if (!item) return;

  editingDoc = { colName, docId, item };

  if (colName === 'skills') {
    editTitle.textContent = '✏️ Edit Offer';
    editFields.innerHTML = `
      <div class="edit-field-group">
        <label>Skill Title</label>
        <input class="form-input" id="ef-skillTitle" value="${esc(item.skillTitle || '')}">
      </div>
      <div class="edit-field-group">
        <label>Category</label>
        <select class="form-input" id="ef-category">
          <option ${item.category==='Technical'?'selected':''}>Technical</option>
          <option ${item.category==='Creative'?'selected':''}>Creative</option>
          <option ${item.category==='Academic'?'selected':''}>Academic</option>
        </select>
      </div>
      <div class="edit-field-group">
        <label>Description</label>
        <textarea class="form-input" id="ef-description" rows="4">${esc(item.description || '')}</textarea>
      </div>
      <div class="edit-field-group">
        <label>Mode</label>
        <select class="form-input" id="ef-mode">
          <option ${item.mode==='In-Person'?'selected':''}>In-Person</option>
          <option ${item.mode==='Online'?'selected':''}>Online</option>
          <option ${item.mode==='Both'?'selected':''}>Both</option>
        </select>
      </div>`;
  } else {
    editTitle.textContent = '✏️ Edit Request';
    editFields.innerHTML = `
      <div class="edit-field-group">
        <label>Skill Needed</label>
        <input class="form-input" id="ef-skillNeeded" value="${esc(item.skillNeeded || '')}">
      </div>
      <div class="edit-field-group">
        <label>Category</label>
        <select class="form-input" id="ef-category">
          <option ${item.category==='Technical'?'selected':''}>Technical</option>
          <option ${item.category==='Creative'?'selected':''}>Creative</option>
          <option ${item.category==='Academic'?'selected':''}>Academic</option>
        </select>
      </div>
      <div class="edit-field-group">
        <label>Learning Goal</label>
        <textarea class="form-input" id="ef-learningGoal" rows="4">${esc(item.learningGoal || '')}</textarea>
      </div>
      <div class="edit-field-group">
        <label>Mode</label>
        <select class="form-input" id="ef-mode">
          <option ${item.mode==='In-Person'?'selected':''}>In-Person</option>
          <option ${item.mode==='Online'?'selected':''}>Online</option>
          <option ${item.mode==='Both'?'selected':''}>Both</option>
        </select>
      </div>`;
  }

  editModal.style.display = 'flex';
}

async function saveEdit() {
  if (!editingDoc) return;
  const { colName, docId } = editingDoc;

  try {
    let updates = {
      category: document.getElementById('ef-category').value,
      mode:     document.getElementById('ef-mode').value,
    };
    if (colName === 'skills') {
      updates.skillTitle   = document.getElementById('ef-skillTitle').value.trim();
      updates.description  = document.getElementById('ef-description').value.trim();
    } else {
      updates.skillNeeded  = document.getElementById('ef-skillNeeded').value.trim();
      updates.learningGoal = document.getElementById('ef-learningGoal').value.trim();
    }

    await updateDoc(doc(db, colName, docId), updates);
    closeEditModal();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

function closeEditModal() {
  editModal.style.display = 'none';
  editingDoc = null;
}

// ── Event listeners ───────────────────────────────────────────────────────
tabOffers.addEventListener('click', () => {
  activeTab = 'offers';
  tabOffers.classList.add('active');
  tabRequests.classList.remove('active');
  offersPanel.style.display   = 'block';
  requestsPanel.style.display = 'none';
  render();
});

tabRequests.addEventListener('click', () => {
  activeTab = 'requests';
  tabRequests.classList.add('active');
  tabOffers.classList.remove('active');
  requestsPanel.style.display = 'block';
  offersPanel.style.display   = 'none';
  render();
});

adminSearch.addEventListener('input', () => {
  searchQuery = adminSearch.value;
  render();
});

saveEditBtn.addEventListener('click', saveEdit);
document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

// ── Real-time Firestore listeners ─────────────────────────────────────────
onSnapshot(
  query(collection(db, 'skills'),   orderBy('timestamp', 'desc')),
  snap => {
    allOffers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    if (activeTab === 'offers') render();
  }
);

onSnapshot(
  query(collection(db, 'requests'), orderBy('timestamp', 'desc')),
  snap => {
    allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    if (activeTab === 'requests') render();
  }
);
