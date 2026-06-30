let messagesRef;
let currentRoomKey = '';

// Puter folder root for MujConnects
const PUTER_ROOT = 'MujConnects';

function renderChat() {
  const p = getProfile();
  if (!isLoggedIn()) return (location.hash = "login");
  if (!p.program || !p.course || !p.year) return (location.hash = "home");

  currentRoomKey = buildRoomKey(p.program, p.course, p.year);
  const roomLabel = `${p.program} · ${p.course} · ${p.year}`;

  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">

      <!-- Header -->
      <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 class="text-base font-bold">${roomLabel}</h3>
          <p class="text-xs text-zinc-500">Group Chat</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="filesTabBtn" onclick="switchTab('files')" class="tab-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">📁 Files</button>
          <button id="chatTabBtn" onclick="switchTab('chat')" class="tab-btn text-xs px-3 py-1 rounded-lg bg-blue-600 text-white">💬 Chat</button>
        </div>
      </div>

      <!-- Chat Panel -->
      <div id="chatPanel">
        <div id="chatBox" class="h-[55vh] overflow-y-auto border rounded-xl p-3 mb-2 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div class="text-sm text-zinc-400 text-center py-4">Loading messages...</div>
        </div>
        <div class="flex gap-2">
          <input id="msgInput" placeholder="Type a message..." class="flex-1 border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
          <label id="fileAttachBtn" title="Attach file" class="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm select-none">
            📎
            <input type="file" id="attachInput" class="hidden" />
          </label>
          <button id="sendBtn" class="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors">Send</button>
        </div>
      </div>

      <!-- Files Panel (hidden by default) -->
      <div id="filesPanel" class="hidden">
        <!-- Upload area -->
        <div id="dropZone" class="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-6 text-center mb-3 cursor-pointer hover:border-blue-400 transition-colors">
          <div class="text-3xl mb-2">📤</div>
          <p class="text-sm text-zinc-500">Drop files here or <span class="text-blue-600 underline cursor-pointer" id="browseBtn">browse</span></p>
          <p class="text-xs text-zinc-400 mt-1">Max 50MB per file</p>
          <input type="file" id="fileUploadInput" class="hidden" multiple />
        </div>

        <!-- Upload progress -->
        <div id="uploadProgress" class="hidden mb-3">
          <div class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span id="uploadStatus">Uploading...</span>
          </div>
        </div>

        <!-- File list -->
        <div id="fileList" class="space-y-2 max-h-[50vh] overflow-y-auto">
          <div class="text-sm text-zinc-400 text-center py-6">Loading files...</div>
        </div>
      </div>

    </div>
  `;

  // Cleanup previous listener
  if (messagesRef) messagesRef.off();
  messagesRef = firebase.database().ref('chats/' + currentRoomKey + '/messages');
  loadMessages();

  // Chat send handlers
  $("#sendBtn").onclick = sendMessage;
  $("#msgInput").onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

  // File attach in chat (quick share)
  $("#attachInput").onchange = (e) => {
    const file = e.target.files[0];
    if (file) uploadAndShareInChat(file);
    e.target.value = '';
  };

  // Files panel upload
  const uploadInput = $("#fileUploadInput");
  $("#browseBtn").onclick = () => uploadInput.click();
  $("#dropZone").onclick = (e) => { if (e.target.id !== 'browseBtn') uploadInput.click(); };
  uploadInput.onchange = (e) => handleFileUpload(Array.from(e.target.files));

  // Drag and drop
  const dropZone = $("#dropZone");
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500','bg-blue-50','dark:bg-blue-950'); };
  dropZone.ondragleave = () => dropZone.classList.remove('border-blue-500','bg-blue-50','dark:bg-blue-950');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500','bg-blue-50','dark:bg-blue-950');
    handleFileUpload(Array.from(e.dataTransfer.files));
  };
}

function switchTab(tab) {
  const chatPanel = $("#chatPanel");
  const filesPanel = $("#filesPanel");
  const chatBtn = $("#chatTabBtn");
  const filesBtn = $("#filesTabBtn");

  if (tab === 'files') {
    chatPanel.classList.add('hidden');
    filesPanel.classList.remove('hidden');
    filesBtn.className = 'tab-btn text-xs px-3 py-1 rounded-lg bg-blue-600 text-white';
    chatBtn.className = 'tab-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors';
    loadFileList();
  } else {
    filesPanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    chatBtn.className = 'tab-btn text-xs px-3 py-1 rounded-lg bg-blue-600 text-white';
    filesBtn.className = 'tab-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors';
  }
}

// ── PUTER FILE FUNCTIONS ─────────────────────────────────────────

function puterFolderPath() {
  return `${PUTER_ROOT}/${currentRoomKey}`;
}

async function ensureFolderExists() {
  try {
    await puter.fs.mkdir(PUTER_ROOT, { createMissingParents: true });
  } catch(e) {}
  try {
    await puter.fs.mkdir(puterFolderPath(), { createMissingParents: true });
  } catch(e) {}
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

      // Post file message to Firebase chat
      const p = getProfile();
      const user = firebase.auth().currentUser;
      if (messagesRef && user) {
        const url = await puter.fs.getReadURL(filePath);
        await messagesRef.push({
          type: 'file',
          fileName: file.name,
          fileSize: file.size,
          fileUrl: url,
          displayName: p.displayName || user.displayName || 'Student',
          uid: user.uid,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Failed to upload ${file.name}: ${err.message}`);
    }
  }

  progressEl.classList.add('hidden');
  loadFileList();
}

async function uploadAndShareInChat(file) {
  const sendBtn = $("#sendBtn");
  sendBtn.textContent = '⏳';
  sendBtn.disabled = true;

  try {
    await ensureFolderExists();
    const filePath = `${puterFolderPath()}/${file.name}`;
    await puter.fs.write(filePath, file, { dedupeName: true });
    const url = await puter.fs.getReadURL(filePath);

    const p = getProfile();
    const user = firebase.auth().currentUser;
    await messagesRef.push({
      type: 'file',
      fileName: file.name,
      fileSize: file.size,
      fileUrl: url,
      displayName: p.displayName || user.displayName || 'Student',
      uid: user.uid,
      timestamp: Date.now()
    });
  } catch (err) {
    alert('File share failed: ' + err.message);
  }

  sendBtn.textContent = 'Send';
  sendBtn.disabled = false;
}

async function loadFileList() {
  const fileList = $("#fileList");
  if (!fileList) return;
  fileList.innerHTML = '<div class="text-sm text-zinc-400 text-center py-6">Loading...</div>';

  try {
    await ensureFolderExists();
    const items = await puter.fs.readdir(puterFolderPath());

    if (!items || items.length === 0) {
      fileList.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No files yet. Upload the first one! 📂</div>';
      return;
    }

    // Sort newest first (by name as fallback)
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
            class="opacity-0 group-hover:opacity-100 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-all">
            ⬇ Download
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    fileList.innerHTML = `<div class="text-sm text-red-400 text-center py-6">Could not load files: ${escapeHtml(err.message)}</div>`;
  }
}

async function downloadFile(filePath) {
  try {
    const url = await puter.fs.getReadURL(filePath);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  } catch (err) {
    alert('Download failed: ' + err.message);
  }
}

// ── CHAT FUNCTIONS ───────────────────────────────────────────────

function loadMessages() {
  const chatBox = $("#chatBox");
  chatBox.innerHTML = '';

  messagesRef.limitToLast(80).on('child_added', (snapshot) => {
    displayMessage(snapshot.val());
  });

  setTimeout(() => {
    if (chatBox && chatBox.children.length === 0) {
      chatBox.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No messages yet. Say hello! 👋</div>';
    }
  }, 2500);
}

function sendMessage() {
  const msgInput = $("#msgInput");
  const val = msgInput.value.trim();
  if (!val) return;

  const p = getProfile();
  const user = firebase.auth().currentUser;
  if (!user) { alert('Please login again.'); return; }

  const chatBox = $("#chatBox");
  const placeholder = chatBox.querySelector('.text-zinc-400');
  if (placeholder) placeholder.remove();

  messagesRef.push({
    type: 'text',
    text: val,
    displayName: p.displayName || user.displayName || 'Student',
    email: user.email,
    uid: user.uid,
    timestamp: Date.now()
  }).then(() => { msgInput.value = ''; })
    .catch((err) => { alert('Failed to send: ' + err.message); });
}

function displayMessage(msgData) {
  const chatBox = $("#chatBox");
  if (!chatBox) return;

  // Remove empty-state placeholder
  const placeholder = chatBox.querySelector('.text-zinc-400');
  if (placeholder) placeholder.remove();

  const currentUser = firebase.auth().currentUser;
  const isOwn = currentUser && msgData.uid === currentUser.uid;
  const timeStr = new Date(msgData.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const msg = document.createElement("div");
  msg.className = `mt-2 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`;

  if (msgData.type === 'file') {
    const icon = getFileIcon(msgData.fileName || '');
    const size = msgData.fileSize ? formatBytes(msgData.fileSize) : '';
    msg.innerHTML = `
      <div class="text-xs font-semibold mb-1 text-zinc-500 px-1">${isOwn ? 'You' : escapeHtml(msgData.displayName)}</div>
      <a href="${msgData.fileUrl}" target="_blank" 
         class="${isOwn ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'} border rounded-xl px-3 py-2 max-w-[75%] flex items-center gap-2 hover:opacity-80 transition-opacity no-underline">
        <span class="text-xl">${icon}</span>
        <div class="min-w-0">
          <p class="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">${escapeHtml(msgData.fileName || 'File')}</p>
          ${size ? `<p class="text-xs text-zinc-400">${size}</p>` : ''}
        </div>
        <span class="text-blue-600 text-xs ml-1 flex-shrink-0">⬇</span>
      </a>
      <div class="text-[10px] text-zinc-400 mt-1 px-1">${timeStr}</div>
    `;
  } else {
    msg.innerHTML = `
      <div class="text-xs font-semibold mb-1 text-zinc-500 px-1">${isOwn ? 'You' : escapeHtml(msgData.displayName)}</div>
      <div class="${isOwn ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'} px-3 py-2 rounded-2xl ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} max-w-[75%] text-sm leading-relaxed">
        ${escapeHtml(msgData.text)}
      </div>
      <div class="text-[10px] text-zinc-400 mt-1 px-1">${timeStr}</div>
    `;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ── HELPERS ──────────────────────────────────────────────────────

function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊',
    xls: '📈', xlsx: '📈', txt: '📃', md: '📃',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
    mp3: '🎵', wav: '🎵', m4a: '🎵',
    zip: '🗜️', rar: '🗜️', '7z': '🗜️',
    js: '💻', ts: '💻', py: '💻', java: '💻', cpp: '💻', c: '💻',
    html: '🌐', css: '🎨', json: '🔧',
  };
  return icons[ext] || '📁';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
}

function cleanupChat() {
  if (messagesRef) messagesRef.off();
}
