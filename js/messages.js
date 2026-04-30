// messages.js — Real-time Firestore messaging
import { requireAuth, updateNavAuth } from './auth.js';
import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, setDoc, getDocs,
  onSnapshot, query, orderBy, where,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const currentUser = await requireAuth();
updateNavAuth();
const myEmail = currentUser.email;

// ── Conversation ID: deterministic, same for both users ───────────────────
function convId(a, b) { return [a, b].sort().join('__'); }

// ── State ─────────────────────────────────────────────────────────────────
let activeConvId  = null;
let convDocs      = [];
let unsubMessages = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const convList        = document.getElementById('conv-list');
const convEmpty       = document.getElementById('conv-empty');
const convSearch      = document.getElementById('conv-search');
const chatPlaceholder = document.getElementById('chat-placeholder');
const chatActive      = document.getElementById('chat-active');
const chatMessages    = document.getElementById('chat-messages');
const chatPeerName    = document.getElementById('chat-peer-name');
const chatPeerAvatar  = document.getElementById('chat-peer-avatar');
const msgInput        = document.getElementById('msg-input');
const sendMsgBtn      = document.getElementById('send-msg-btn');
const connectModal    = document.getElementById('connect-modal');
const scheduleModal   = document.getElementById('schedule-modal');

// ── Helpers ───────────────────────────────────────────────────────────────
function initials(email) {
  const p = email.split('@')[0].split('.');
  return p[p.length - 1].slice(0, 2).toUpperCase();
}
function fmtTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? fmtTime(ts)
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function esc(t) {
  return (t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
function peerOf(conv) {
  return (conv.participants || []).find(p => p !== myEmail) || '';
}

// ── Render conversation list ──────────────────────────────────────────────
function renderConvList(filter = '') {
  const filtered = convDocs.filter(c =>
    peerOf(c).toLowerCase().includes(filter.toLowerCase())
  );
  if (filtered.length === 0) {
    convList.innerHTML = '';
    convEmpty.style.display = 'flex';
    return;
  }
  convEmpty.style.display = 'none';
  convList.innerHTML = filtered.map(c => {
    const peer = peerOf(c);
    const last = c.lastMessage
      ? (c.lastMessage.length > 40 ? c.lastMessage.slice(0, 40) + '…' : c.lastMessage)
      : 'No messages yet';
    return `
      <li class="conv-item ${c.id === activeConvId ? 'active' : ''}"
          data-id="${c.id}" data-peer="${peer}">
        <div class="conv-avatar">${initials(peer)}</div>
        <div class="conv-info">
          <span class="conv-name">${peer.split('@')[0]}</span>
          <span class="conv-last">${esc(last)}</span>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${fmtDate(c.lastTs)}</span>
        </div>
      </li>`;
  }).join('');
  convList.querySelectorAll('.conv-item').forEach(li =>
    li.addEventListener('click', () => openConversation(li.dataset.id, li.dataset.peer))
  );
}

// ── Open conversation ─────────────────────────────────────────────────────
function openConversation(cId, peer) {
  activeConvId = cId;
  chatPlaceholder.style.display = 'none';
  chatActive.style.display      = 'flex';
  chatPeerName.textContent      = peer.split('@')[0];
  chatPeerAvatar.textContent    = initials(peer);
  renderConvList(convSearch.value);
  msgInput.focus();

  if (unsubMessages) unsubMessages();

  chatMessages.innerHTML = `<div style="display:flex;justify-content:center;padding:40px 0;">
    <div class="spinner"></div></div>`;

  unsubMessages = onSnapshot(
    query(collection(db, 'conversations', cId, 'messages'), orderBy('ts')),
    snap => {
      if (snap.empty) {
        chatMessages.innerHTML = `
          <div class="chat-day-divider">Start of conversation</div>
          <div class="chat-info-msg">Say hello! 👋</div>`;
        return;
      }
      let html = '', prevDate = '';
      snap.docs.forEach(d => {
        const msg = d.data();
        const dateStr = msg.ts?.toDate
          ? msg.ts.toDate().toDateString() : new Date().toDateString();
        if (dateStr !== prevDate) {
          html += `<div class="chat-day-divider">${
            dateStr === new Date().toDateString() ? 'Today' : dateStr}</div>`;
          prevDate = dateStr;
        }
        const isMe = msg.from === myEmail;
        html += `
          <div class="chat-bubble-wrap ${isMe ? 'me' : 'them'}">
            <div class="chat-bubble ${isMe ? 'bubble-me' : 'bubble-them'}">
              <p>${esc(msg.text)}</p>
              <span class="bubble-time">${fmtTime(msg.ts)}</span>
            </div>
          </div>`;
      });
      chatMessages.innerHTML = html;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  );
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !activeConvId) return;
  msgInput.value = '';
  msgInput.style.height = 'auto';
  try {
    await addDoc(collection(db, 'conversations', activeConvId, 'messages'), {
      from: myEmail, text, ts: serverTimestamp()
    });
    await setDoc(doc(db, 'conversations', activeConvId),
      { lastMessage: text, lastTs: serverTimestamp(), lastFrom: myEmail },
      { merge: true }
    );
  } catch (err) {
    console.error('Send failed:', err);
    msgInput.value = text;
  }
}

// ── Connect modal ─────────────────────────────────────────────────────────
function openConnectModal() {
  document.getElementById('peer-email-input').value = '';
  document.getElementById('connect-message').value  = '';
  document.getElementById('peer-email-err').classList.remove('show');
  document.getElementById('connect-msg-err').classList.remove('show');
  connectModal.style.display = 'flex';
  setTimeout(() => document.getElementById('peer-email-input').focus(), 50);
}
function closeConnectModal() { connectModal.style.display = 'none'; }

async function handleSendConnect() {
  const peer = document.getElementById('peer-email-input').value.trim().toLowerCase();
  const text = document.getElementById('connect-message').value.trim();
  const emailErr = document.getElementById('peer-email-err');
  const msgErr   = document.getElementById('connect-msg-err');
  emailErr.classList.remove('show'); msgErr.classList.remove('show');

  let valid = true;
  if (!peer || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(peer)) {
    emailErr.classList.add('show'); valid = false;
  }
  if (!text) { msgErr.classList.add('show'); valid = false; }
  if (!valid) return;
  if (peer === myEmail.toLowerCase()) {
    emailErr.textContent = 'You cannot message yourself.';
    emailErr.classList.add('show'); return;
  }
  const cId = convId(myEmail, peer);
  try {
    await setDoc(doc(db, 'conversations', cId),
      { participants: [myEmail, peer], lastMessage: text,
        lastTs: serverTimestamp(), lastFrom: myEmail },
      { merge: true }
    );
    await addDoc(collection(db, 'conversations', cId, 'messages'), {
      from: myEmail, text, ts: serverTimestamp()
    });
    closeConnectModal();
    openConversation(cId, peer);
  } catch (err) { alert('Failed: ' + err.message); }
}

// ── Schedule modal ────────────────────────────────────────────────────────
function openScheduleModal()  { scheduleModal.style.display = 'flex'; }
function closeScheduleModal() { scheduleModal.style.display = 'none'; }

async function handleConfirmSchedule() {
  const date = document.getElementById('session-date').value;
  const time = document.getElementById('session-time').value;
  const mode = document.getElementById('session-mode').value;
  if (!date || !time || !mode || !activeConvId) return;
  const text = `📅 Session Scheduled!\nDate: ${date}\nTime: ${time}\nMode: ${mode}`;
  await addDoc(collection(db, 'conversations', activeConvId, 'messages'),
    { from: myEmail, text, ts: serverTimestamp() }
  );
  await setDoc(doc(db, 'conversations', activeConvId),
    { lastMessage: text, lastTs: serverTimestamp(), lastFrom: myEmail },
    { merge: true }
  );
  closeScheduleModal();
}

// ── Delete conversation ───────────────────────────────────────────────────
async function deleteConversation() {
  if (!activeConvId) return;
  const conv = convDocs.find(c => c.id === activeConvId);
  const peer = conv ? peerOf(conv) : 'this contact';
  if (!confirm(`Delete conversation with ${peer.split('@')[0]}?`)) return;
  try {
    const msgsSnap = await getDocs(
      collection(db, 'conversations', activeConvId, 'messages')
    );
    const batch = writeBatch(db);
    msgsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'conversations', activeConvId));
    await batch.commit();
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    activeConvId = null;
    chatActive.style.display      = 'none';
    chatPlaceholder.style.display = 'flex';
  } catch (err) { alert('Delete failed: ' + err.message); }
}

// ── Event listeners ───────────────────────────────────────────────────────
document.getElementById('new-msg-btn').addEventListener('click', openConnectModal);
document.getElementById('start-connect-btn').addEventListener('click', openConnectModal);
document.getElementById('close-connect-modal').addEventListener('click', closeConnectModal);
document.getElementById('send-connect-btn').addEventListener('click', handleSendConnect);
document.getElementById('schedule-btn').addEventListener('click', openScheduleModal);
document.getElementById('close-schedule-modal').addEventListener('click', closeScheduleModal);
document.getElementById('confirm-schedule-btn').addEventListener('click', handleConfirmSchedule);
document.getElementById('delete-conv-btn').addEventListener('click', deleteConversation);
sendMsgBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
});
convSearch.addEventListener('input', () => renderConvList(convSearch.value));
[connectModal, scheduleModal].forEach(modal =>
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; })
);

// ── Real-time conversation list ───────────────────────────────────────────
onSnapshot(
  query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', myEmail),
    orderBy('lastTs', 'desc')
  ),
  snap => {
    convDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderConvList(convSearch.value);
  }
);
