let messagesRef;
let onlineRef;
let currentRoomKey = '';
const PUTER_ROOT = 'MujConnects';
const avatarCache = {};

async function getUserPhoto(uid) {
  if (avatarCache[uid] !== undefined) return avatarCache[uid];
  try {
    const snap = await firebase.database().ref('users/' + uid + '/photoURL').once('value');
    avatarCache[uid] = snap.val() || null;
  } catch(e) { avatarCache[uid] = null; }
  return avatarCache[uid];
}

// ── ONLINE PRESENCE ──────────────────────────────────────────────
function setupPresence(roomKey) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const p = getProfile();
  const userOnlineRef = firebase.database().ref(`chats/${roomKey}/online/${user.uid}`);
  const connectedRef = firebase.database().ref('.info/connected');

  connectedRef.on('value', snap => {
    if (!snap.val()) return;
    userOnlineRef.onDisconnect().remove();
    userOnlineRef.set({ displayName: p.displayName, photoURL: p.photoURL || null, at: Date.now() });
  });
  onlineRef = userOnlineRef;
}

function cleanupPresence() {
  if (onlineRef) onlineRef.remove().catch(() => {});
}

// ── RENDER CHAT ──────────────────────────────────────────────────
function renderChat() {
  const p = getProfile();
  if (!isLoggedIn()) return (location.hash = "login");
  if (!p.program || !p.course || !p.batch) return (location.hash = "home");

  currentRoomKey = buildRoomKey(p.program, p.course, p.batch);
  const roomLabel = `${p.program} · ${p.course} · ${p.batch}`;

  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">
      <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 class="text-base font-bold">${roomLabel}</h3>
          <div id="onlineBar" class="text-xs text-green-500 mt-0.5"></div>
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          <button onclick="switchChatTab('announcements')" id="tabAnnounce" class="chat-tab text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📢 Notices</button>
          <button onclick="switchChatTab('polls')" id="tabPolls" class="chat-tab text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📊 Polls</button>
          <button onclick="switchChatTab('files')" id="tabFiles" class="chat-tab text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📁 Files</button>
          <button onclick="switchChatTab('chat')" id="tabChat" class="chat-tab text-xs px-3 py-1 rounded-lg bg-blue-600 text-white">💬 Chat</button>
        </div>
      </div>

      <!-- CHAT PANEL -->
      <div id="panelChat">
        <div id="chatBox" class="h-[55vh] overflow-y-auto border rounded-xl p-3 mb-2 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div class="text-sm text-zinc-400 text-center py-4">Loading messages...</div>
        </div>
        <div id="pinnedBar" class="hidden mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl text-xs text-yellow-800 dark:text-yellow-200"></div>
        <div class="flex gap-2">
          <input id="msgInput" placeholder="Type a message..." class="flex-1 border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
          <label class="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm select-none" title="Attach file">
            📎<input type="file" id="attachInput" class="hidden" />
          </label>
          <button id="sendBtn" class="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors">Send</button>
        </div>
        <div id="searchBar" class="mt-2 hidden">
          <input id="searchInput" placeholder="Search messages..." class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
          <div id="searchResults" class="mt-1 space-y-1 max-h-40 overflow-y-auto"></div>
        </div>
        <div class="flex gap-2 mt-2">
          <button onclick="toggleSearch()" class="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">🔍 Search</button>
          <button onclick="requestNotificationPermission()" class="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">🔔 Enable Notifications</button>
        </div>
      </div>

      <!-- ANNOUNCEMENTS PANEL -->
      <div id="panelAnnouncements" class="hidden">
        ${isAdmin() ? `
        <div class="mb-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p class="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-2">📢 Post Announcement (Admin)</p>
          <textarea id="announceInput" placeholder="Write announcement..." rows="3" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm mb-2"></textarea>
          <button onclick="postAnnouncement()" class="rounded-xl bg-yellow-500 text-white px-4 py-1.5 text-sm hover:bg-yellow-600 transition-colors">Post</button>
        </div>` : ''}
        <div id="announceList" class="space-y-3 max-h-[55vh] overflow-y-auto">
          <div class="text-sm text-zinc-400 text-center py-8">Loading announcements...</div>
        </div>
      </div>

      <!-- POLLS PANEL -->
      <div id="panelPolls" class="hidden">
        ${isAdmin() ? `
        <div class="mb-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">📊 Create Poll (Admin)</p>
          <input id="pollQuestion" placeholder="Poll question..." class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm mb-2" />
          <div id="pollOptions">
            <input placeholder="Option 1" class="poll-opt w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm mb-1" />
            <input placeholder="Option 2" class="poll-opt w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm mb-1" />
          </div>
          <div class="flex gap-2 mt-1">
            <button onclick="addPollOption()" class="text-xs text-blue-600 underline">+ Add option</button>
            <button onclick="postPoll()" class="rounded-xl bg-blue-600 text-white px-4 py-1.5 text-sm hover:bg-blue-700 ml-auto">Create Poll</button>
          </div>
        </div>` : ''}
        <div id="pollList" class="space-y-3 max-h-[55vh] overflow-y-auto">
          <div class="text-sm text-zinc-400 text-center py-8">Loading polls...</div>
        </div>
      </div>

      <!-- FILES PANEL -->
      <div id="panelFiles" class="hidden">
        <div id="dropZone" class="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-6 text-center mb-3 cursor-pointer hover:border-blue-400 transition-colors">
          <div class="text-3xl mb-2">📤</div>
          <p class="text-sm text-zinc-500">Drop files here or <span class="text-blue-600 underline" id="browseBtn">browse</span></p>
          <p class="text-xs text-zinc-400 mt-1">Max 50MB per file</p>
          <input type="file" id="fileUploadInput" class="hidden" multiple />
        </div>
        <div id="uploadProgress" class="hidden mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span id="uploadStatus">Uploading...</span>
        </div>
        <div id="fileList" class="space-y-2 max-h-[50vh] overflow-y-auto">
          <div class="text-sm text-zinc-400 text-center py-6">Loading files...</div>
        </div>
      </div>
    </div>
  `;

  if (messagesRef) messagesRef.off();
  messagesRef = firebase.database().ref('chats/' + currentRoomKey + '/messages');
  loadMessages();
  loadPinnedMessage();
  setupPresence(currentRoomKey);
  setupOnlineCounter();

  $("#sendBtn").onclick = sendMessage;
  $("#msgInput").onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
  $("#attachInput").onchange = (e) => {
    const file = e.target.files[0];
    if (file) uploadAndShareInChat(file);
    e.target.value = '';
  };

  const uploadInput = $("#fileUploadInput");
  if (uploadInput) {
    $("#browseBtn").onclick = () => uploadInput.click();
    $("#dropZone").onclick = (e) => { if (e.target.id !== 'browseBtn') uploadInput.click(); };
    uploadInput.onchange = (e) => handleFileUpload(Array.from(e.target.files));
    const dz = $("#dropZone");
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('border-blue-500'); };
    dz.ondragleave = () => dz.classList.remove('border-blue-500');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('border-blue-500'); handleFileUpload(Array.from(e.dataTransfer.files)); };
  }
}

function switchChatTab(tab) {
  ['chat','announcements','polls','files'].forEach(t => {
    const panel = $(`#panel${t.charAt(0).toUpperCase()+t.slice(1)}`);
    const btn = $(`#tab${t.charAt(0).toUpperCase()+t.slice(1)}`);
    if (!panel || !btn) return;
    if (t === tab) {
      panel.classList.remove('hidden');
      btn.className = 'chat-tab text-xs px-3 py-1 rounded-lg bg-blue-600 text-white';
    } else {
      panel.classList.add('hidden');
      btn.className = 'chat-tab text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800';
    }
  });
  if (tab === 'announcements') loadAnnouncements();
  if (tab === 'polls') loadPolls();
  if (tab === 'files') loadFileList();
}

// ── ONLINE STATUS ────────────────────────────────────────────────
function setupOnlineCounter() {
  firebase.database().ref(`chats/${currentRoomKey}/online`).on('value', snap => {
    const bar = $("#onlineBar");
    if (!bar) return;
    const count = snap.numChildren();
    bar.textContent = count > 0 ? `🟢 ${count} online` : '';
  });
}

// ── SEARCH ───────────────────────────────────────────────────────
function toggleSearch() {
  const bar = $("#searchBar");
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) $("#searchInput").focus();
  $("#searchInput").oninput = function() {
    const q = this.value.trim().toLowerCase();
    const results = $("#searchResults");
    if (!q) { results.innerHTML = ''; return; }
    messagesRef.once('value', snap => {
      const msgs = [];
      snap.forEach(child => {
        const m = child.val();
        if (m.type === 'text' && m.text && m.text.toLowerCase().includes(q)) msgs.push(m);
      });
      if (!msgs.length) { results.innerHTML = '<p class="text-xs text-zinc-400 px-2">No results</p>'; return; }
      results.innerHTML = msgs.slice(-10).map(m => `
        <div class="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs">
          <span class="font-medium">${escapeHtml(m.displayName)}</span>: ${escapeHtml(m.text)}
        </div>`).join('');
    });
  };
}

// ── ANNOUNCEMENTS ────────────────────────────────────────────────
function postAnnouncement() {
  if (!isAdmin()) return;
  const text = $("#announceInput").value.trim();
  if (!text) return;
  const user = firebase.auth().currentUser;
  firebase.database().ref(`chats/${currentRoomKey}/announcements`).push({
    text, displayName: getProfile().displayName, uid: user.uid, timestamp: Date.now(), pinned: false
  }).then(() => { $("#announceInput").value = ''; loadAnnouncements(); });
}

function loadAnnouncements() {
  const list = $("#announceList");
  if (!list) return;
  firebase.database().ref(`chats/${currentRoomKey}/announcements`).orderByChild('timestamp').once('value', snap => {
    if (!snap.exists()) { list.innerHTML = '<p class="text-sm text-zinc-400 text-center py-8">No announcements yet.</p>'; return; }
    const items = [];
    snap.forEach(c => items.push({ id: c.key, ...c.val() }));
    list.innerHTML = items.reverse().map(a => `
      <div class="border rounded-xl p-4 dark:border-zinc-700 ${a.pinned ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950' : ''}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            ${a.pinned ? '<span class="text-xs text-yellow-600 font-semibold">📌 Pinned</span><br/>' : ''}
            <p class="text-sm">${escapeHtml(a.text)}</p>
            <p class="text-xs text-zinc-400 mt-1">${escapeHtml(a.displayName)} · ${new Date(a.timestamp).toLocaleDateString('en-IN')}</p>
          </div>
          ${isAdmin() ? `
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="pinAnnouncement('${a.id}', ${!a.pinned})" class="text-xs px-2 py-1 rounded-lg border dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700">${a.pinned ? 'Unpin' : '📌 Pin'}</button>
            <button onclick="deleteAnnouncement('${a.id}')" class="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950">🗑</button>
          </div>` : ''}
        </div>
      </div>`).join('');
  });
}

function pinAnnouncement(id, pin) {
  firebase.database().ref(`chats/${currentRoomKey}/announcements/${id}`).update({ pinned: pin }).then(loadAnnouncements);
}

function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  firebase.database().ref(`chats/${currentRoomKey}/announcements/${id}`).remove().then(loadAnnouncements);
}

// ── PIN MESSAGE ──────────────────────────────────────────────────
function pinMessage(msgId, text, senderName) {
  if (!isAdmin()) return;
  firebase.database().ref(`chats/${currentRoomKey}/pinnedMessage`).set({ msgId, text, senderName, at: Date.now() });
}

function loadPinnedMessage() {
  firebase.database().ref(`chats/${currentRoomKey}/pinnedMessage`).on('value', snap => {
    const bar = $("#pinnedBar");
    if (!bar) return;
    if (snap.exists()) {
      const d = snap.val();
      bar.classList.remove('hidden');
      bar.innerHTML = `📌 <strong>${escapeHtml(d.senderName)}:</strong> ${escapeHtml(d.text)} ${isAdmin() ? `<button onclick="unpinMessage()" class="ml-2 underline text-yellow-600">Unpin</button>` : ''}`;
    } else {
      bar.classList.add('hidden');
    }
  });
}

function unpinMessage() {
  firebase.database().ref(`chats/${currentRoomKey}/pinnedMessage`).remove();
}

// ── POLLS ────────────────────────────────────────────────────────
function addPollOption() {
  const container = $("#pollOptions");
  const count = container.querySelectorAll('.poll-opt').length + 1;
  const inp = document.createElement('input');
  inp.placeholder = `Option ${count}`;
  inp.className = 'poll-opt w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm mb-1';
  container.appendChild(inp);
}

function postPoll() {
  if (!isAdmin()) return;
  const question = $("#pollQuestion").value.trim();
  const opts = Array.from(document.querySelectorAll('.poll-opt')).map(i => i.value.trim()).filter(Boolean);
  if (!question || opts.length < 2) { alert('Add a question and at least 2 options.'); return; }
  const user = firebase.auth().currentUser;
  const options = {};
  opts.forEach((o, i) => { options[`opt${i}`] = { text: o, votes: {} }; });
  firebase.database().ref(`chats/${currentRoomKey}/polls`).push({
    question, options, uid: user.uid,
    displayName: getProfile().displayName, timestamp: Date.now(), active: true
  }).then(() => { $("#pollQuestion").value = ''; loadPolls(); });
}

function votePoll(pollId, optKey) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  // Remove previous vote first, then add new
  const pollRef = firebase.database().ref(`chats/${currentRoomKey}/polls/${pollId}/options`);
  pollRef.once('value', snap => {
    const updates = {};
    snap.forEach(opt => { updates[`${opt.key}/votes/${user.uid}`] = null; });
    updates[`${optKey}/votes/${user.uid}`] = true;
    pollRef.update(updates).then(loadPolls);
  });
}

function loadPolls() {
  const list = $("#pollList");
  if (!list) return;
  const user = firebase.auth().currentUser;
  firebase.database().ref(`chats/${currentRoomKey}/polls`).orderByChild('timestamp').once('value', snap => {
    if (!snap.exists()) { list.innerHTML = '<p class="text-sm text-zinc-400 text-center py-8">No polls yet.</p>'; return; }
    const polls = [];
    snap.forEach(c => polls.push({ id: c.key, ...c.val() }));
    list.innerHTML = polls.reverse().map(poll => {
      const opts = Object.entries(poll.options || {});
      const totalVotes = opts.reduce((s, [, o]) => s + Object.keys(o.votes || {}).length, 0);
      const myVote = opts.find(([, o]) => o.votes && o.votes[user.uid]);
      return `
        <div class="border rounded-xl p-4 dark:border-zinc-700">
          <p class="text-sm font-semibold mb-3">${escapeHtml(poll.question)}</p>
          <div class="space-y-2">
            ${opts.map(([key, opt]) => {
              const count = Object.keys(opt.votes || {}).length;
              const pct = totalVotes ? Math.round(count / totalVotes * 100) : 0;
              const voted = myVote && myVote[0] === key;
              return `
                <button onclick="votePoll('${poll.id}','${key}')" class="w-full text-left">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="${voted ? 'font-semibold text-blue-600' : ''}">${voted ? '✓ ' : ''}${escapeHtml(opt.text)}</span>
                    <span class="text-zinc-400">${count} (${pct}%)</span>
                  </div>
                  <div class="h-2 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                    <div class="h-full rounded-full ${voted ? 'bg-blue-600' : 'bg-zinc-400'}" style="width:${pct}%"></div>
                  </div>
                </button>`;
            }).join('')}
          </div>
          <p class="text-xs text-zinc-400 mt-2">${totalVotes} vote${totalVotes !== 1 ? 's' : ''} · ${escapeHtml(poll.displayName)}</p>
          ${isAdmin() ? `<button onclick="deletePoll('${poll.id}')" class="text-xs text-red-400 underline mt-1">Delete poll</button>` : ''}
        </div>`;
    }).join('');
  });
}

function deletePoll(id) {
  if (!confirm('Delete this poll?')) return;
  firebase.database().ref(`chats/${currentRoomKey}/polls/${id}`).remove().then(loadPolls);
}

// ── MESSAGES ─────────────────────────────────────────────────────
function loadMessages() {
  const chatBox = $("#chatBox");
  chatBox.innerHTML = '';
  messagesRef.limitToLast(80).on('child_added', snap => { displayMessage(snap.val(), snap.key); });
  setTimeout(() => {
    if (chatBox && chatBox.children.length === 0)
      chatBox.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No messages yet. Say hello! 👋</div>';
  }, 2500);
}

function sendMessage() {
  const msgInput = $("#msgInput");
  const val = msgInput.value.trim();
  if (!val) return;
  const p = getProfile();
  const user = firebase.auth().currentUser;
  if (!user) { alert('Please login again.'); return; }

  const expectedRoom = buildRoomKey(p.program, p.course, p.batch);
  if (currentRoomKey !== expectedRoom) { alert('You can only send messages in your own batch room.'); return; }

  const chatBox = $("#chatBox");
  const placeholder = chatBox.querySelector('.text-zinc-400');
  if (placeholder) placeholder.remove();

  messagesRef.push({
    type: 'text', text: val,
    displayName: p.displayName || 'Student',
    email: user.email, uid: user.uid, timestamp: Date.now()
  }).then(() => { msgInput.value = ''; })
    .catch(err => alert('Failed to send: ' + err.message));
}

async function displayMessage(msgData, msgId) {
  const chatBox = $("#chatBox");
  if (!chatBox) return;
  const placeholder = chatBox.querySelector('.text-zinc-400');
  if (placeholder) placeholder.remove();

  const currentUser = firebase.auth().currentUser;
  const isOwn = currentUser && msgData.uid === currentUser.uid;
  const timeStr = new Date(msgData.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let photoURL = isOwn ? getProfile().photoURL : await getUserPhoto(msgData.uid);
  const initials = (msgData.displayName || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarHtml = photoURL
    ? `<img src="${photoURL}" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />`
    : `<div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-200 flex-shrink-0">${initials}</div>`;

  const msg = document.createElement("div");
  msg.className = `mt-3 flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`;
  msg.dataset.msgId = msgId;

  // Admin pin option on right-click / long press
  const pinBtn = isAdmin() && msgData.type === 'text'
    ? `<button onclick="pinMessage('${msgId}','${escapeHtml(msgData.text).replace(/'/g,"\\'")}','${escapeHtml(msgData.displayName)}')" class="text-[10px] text-zinc-300 hover:text-yellow-400 px-1" title="Pin message">📌</button>`
    : '';

  // Delete own message
  const deleteBtn = isOwn
    ? `<button onclick="deleteMessage('${msgId}')" class="text-[10px] text-zinc-300 hover:text-red-400 px-1" title="Delete">🗑</button>`
    : '';

  if (msgData.type === 'file') {
    const icon = getFileIcon(msgData.fileName || '');
    const size = msgData.fileSize ? formatBytes(msgData.fileSize) : '';
    msg.innerHTML = `
      ${avatarHtml}
      <div class="flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]">
        <div class="text-xs font-semibold mb-1 text-zinc-500 px-1">${isOwn ? 'You' : escapeHtml(msgData.displayName)}</div>
        <a href="${msgData.fileUrl}" target="_blank"
           class="${isOwn ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'} border rounded-xl px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity no-underline">
          <span class="text-xl">${icon}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">${escapeHtml(msgData.fileName || 'File')}</p>
            ${size ? `<p class="text-xs text-zinc-400">${size}</p>` : ''}
          </div>
          <span class="text-blue-600 text-xs ml-1">⬇</span>
        </a>
        <div class="text-[10px] text-zinc-400 mt-1 px-1 flex items-center gap-1">${timeStr} ${deleteBtn}</div>
      </div>`;
  } else {
    msg.innerHTML = `
      ${avatarHtml}
      <div class="flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]">
        <div class="text-xs font-semibold mb-1 text-zinc-500 px-1">${isOwn ? 'You' : escapeHtml(msgData.displayName)}</div>
        <div class="${isOwn ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'} px-3 py-2 rounded-2xl ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} text-sm leading-relaxed">
          ${escapeHtml(msgData.text)}
        </div>
        <div class="text-[10px] text-zinc-400 mt-1 px-1 flex items-center gap-1">${timeStr} ${pinBtn} ${deleteBtn}</div>
      </div>`;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Notification for incoming messages
  if (!isOwn) {
    showNotification(`MujConnects — ${msgData.displayName}`, msgData.type === 'file' ? `📎 ${msgData.fileName}` : msgData.text);
  }
}

function deleteMessage(msgId) {
  if (!confirm('Delete this message?')) return;
  messagesRef.child(msgId).remove().catch(err => alert('Could not delete: ' + err.message));
  // Remove from UI immediately
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) el.remove();
}

// ── PUTER FILE FUNCTIONS ─────────────────────────────────────────
function puterFolderPath() { return `${PUTER_ROOT}/${currentRoomKey}`; }

async function ensureFolderExists() {
  try { await puter.fs.mkdir(PUTER_ROOT, { createMissingParents: true }); } catch(e) {}
  try { await puter.fs.mkdir(puterFolderPath(), { createMissingParents: true }); } catch(e) {}
}

async function handleFileUpload(files) {
  if (!files.length) return;
  const progressEl = $("#uploadProgress");
  const statusEl = $("#uploadStatus");
  progressEl.classList.remove('hidden');
  for (const file of files) {
    statusEl.textContent = `Uploading ${file.name}...`;
    try {
      await ensureFolderExists();
      const filePath = `${puterFolderPath()}/${file.name}`;
      await puter.fs.write(filePath, file, { dedupeName: true });
      const user = firebase.auth().currentUser;
      const p = getProfile();
      if (messagesRef && user) {
        const url = await puter.fs.getReadURL(filePath);
        await messagesRef.push({ type: 'file', fileName: file.name, fileSize: file.size, fileUrl: url, displayName: p.displayName || 'Student', uid: user.uid, timestamp: Date.now() });
      }
    } catch (err) { alert(`Failed to upload ${file.name}: ${err.message}`); }
  }
  progressEl.classList.add('hidden');
  loadFileList();
}

async function uploadAndShareInChat(file) {
  const sendBtn = $("#sendBtn");
  sendBtn.textContent = '⏳'; sendBtn.disabled = true;
  try {
    await ensureFolderExists();
    const filePath = `${puterFolderPath()}/${file.name}`;
    await puter.fs.write(filePath, file, { dedupeName: true });
    const url = await puter.fs.getReadURL(filePath);
    const p = getProfile();
    const user = firebase.auth().currentUser;
    await messagesRef.push({ type: 'file', fileName: file.name, fileSize: file.size, fileUrl: url, displayName: p.displayName || 'Student', uid: user.uid, timestamp: Date.now() });
  } catch (err) { alert('File share failed: ' + err.message); }
  sendBtn.textContent = 'Send'; sendBtn.disabled = false;
}

async function loadFileList() {
  const fileList = $("#fileList");
  if (!fileList) return;
  fileList.innerHTML = '<div class="text-sm text-zinc-400 text-center py-6">Loading...</div>';
  try {
    await ensureFolderExists();
    const items = await puter.fs.readdir(puterFolderPath());
    if (!items || !items.length) { fileList.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No files yet. Upload the first one! 📂</div>'; return; }
    const sorted = [...items].sort((a, b) => (b.modified || 0) - (a.modified || 0));
    fileList.innerHTML = sorted.map(item => {
      const icon = getFileIcon(item.name);
      const size = item.size ? formatBytes(item.size) : '';
      return `
        <div class="flex items-center gap-3 p-3 border rounded-xl dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
          <span class="text-2xl flex-shrink-0">${icon}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(item.name)}</p>
            ${size ? `<p class="text-xs text-zinc-400">${size}</p>` : ''}
          </div>
          <button onclick="downloadFile('${escapeHtml(item.path || puterFolderPath()+'/'+item.name)}')"
            class="opacity-0 group-hover:opacity-100 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-all">⬇ Download</button>
        </div>`;
    }).join('');
  } catch (err) { fileList.innerHTML = `<div class="text-sm text-red-400 text-center py-6">Could not load files.</div>`; }
}

async function downloadFile(filePath) {
  try {
    const url = await puter.fs.getReadURL(filePath);
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.click();
  } catch (err) { alert('Download failed: ' + err.message); }
}

// ── HELPERS ──────────────────────────────────────────────────────
function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const icons = { pdf:'📄', doc:'📝', docx:'📝', ppt:'📊', pptx:'📊', xls:'📈', xlsx:'📈', txt:'📃', md:'📃', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', svg:'🖼️', webp:'🖼️', mp4:'🎬', mov:'🎬', mkv:'🎬', mp3:'🎵', wav:'🎵', zip:'🗜️', rar:'🗜️', js:'💻', py:'💻', java:'💻', cpp:'💻', html:'🌐', css:'🎨', json:'🔧' };
  return icons[ext] || '📁';
}
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}
function escapeHtml(text) {
  const div = document.createElement('div'); div.textContent = String(text || ''); return div.innerHTML;
}
function cleanupChat() {
  if (messagesRef) messagesRef.off();
  cleanupPresence();
  firebase.database().ref(`chats/${currentRoomKey}/online`).off();
  firebase.database().ref(`chats/${currentRoomKey}/pinnedMessage`).off();
}
