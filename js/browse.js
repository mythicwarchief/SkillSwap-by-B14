import { db } from './firebase-config.js';
import { requireAuth, updateNavAuth } from './auth.js';
import {
  collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ── Auth guard ─────────────────────────────────────────────────────────────
await requireAuth();
updateNavAuth();

// ── State ──────────────────────────────────────────────────────────────────
let allSkills    = [];
let allRequests  = [];
let activeTab    = 'skills';   // 'skills' | 'requests'
let activeCat    = 'all';
let searchQuery  = '';

// ── DOM ────────────────────────────────────────────────────────────────────
const grid       = document.getElementById('skills-grid');
const searchInput= document.getElementById('search-input');
const mainTabs   = document.querySelectorAll('.main-tab');
const filterTabs = document.querySelectorAll('.filter-tab');

// ── Real-time listeners ────────────────────────────────────────────────────
const skillsQ  = query(collection(db, 'skills'),   orderBy('timestamp', 'desc'));
const requestQ = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));

onSnapshot(skillsQ, snap => {
  allSkills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (activeTab === 'skills') render();
});

onSnapshot(requestQ, snap => {
  allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (activeTab === 'requests') render();
});

// ── Event Listeners ────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.toLowerCase().trim();
  render();
});

mainTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    mainTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    // Reset category
    activeCat = 'all';
    filterTabs.forEach(t => t.classList.remove('active'));
    filterTabs[0].classList.add('active');
    render();
  });
});

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCat = tab.dataset.cat;
    render();
  });
});

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const source = activeTab === 'skills' ? allSkills : allRequests;

  let data = source;

  if (activeCat !== 'all') {
    data = data.filter(item => item.category?.toLowerCase() === activeCat);
  }

  if (searchQuery) {
    data = data.filter(item => {
      const title = (activeTab === 'skills' ? item.skillTitle : item.skillNeeded) || '';
      return (
        title.toLowerCase().includes(searchQuery) ||
        (item.description || item.learningGoal || '').toLowerCase().includes(searchQuery) ||
        (item.name || '').toLowerCase().includes(searchQuery)
      );
    });
  }

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try a different search or category, or be the first to ${activeTab === 'skills' ? 'offer' : 'request'} one!</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map((item, i) => buildCard(item, i)).join('');
}

function buildCard(item, index) {
  const isSkill   = activeTab === 'skills';
  const title     = isSkill ? item.skillTitle : item.skillNeeded;
  const bodyText  = isSkill ? item.description : item.learningGoal;
  const slots     = isSkill ? (item.availability || []) : (item.schedule || []);
  const cat       = item.category || 'General';
  const badgeClass= badgeFor(cat);
  const timeAgo   = formatTime(item.timestamp);
  const delay     = Math.min(index * 0.06, 0.5);

  return `
    <div class="skill-card" style="animation-delay:${delay}s">
      <div class="skill-card-header">
        <span class="badge ${badgeClass}">${cat}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">${timeAgo}</span>
      </div>
      <div>
        <div class="skill-title">${escHtml(title)}</div>
        <div class="skill-by">by ${escHtml(item.name)}</div>
      </div>
      <p class="skill-desc">${escHtml(bodyText)}</p>
      <div class="skill-meta">
        ${slots.map(s => `<span class="meta-tag">${s}</span>`).join('')}
        ${item.mode ? `<span class="meta-tag">${item.mode}</span>` : ''}
      </div>
      <a href="mailto:${item.email}?subject=SkillSwap%20-%20${encodeURIComponent(title)}"
         class="btn btn-sm">Connect →</a>
    </div>`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function badgeFor(cat) {
  const map = { Technical: 'badge-technical', Creative: 'badge-creative', Academic: 'badge-academic' };
  return map[cat] || 'badge-academic';
}

function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff  = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
