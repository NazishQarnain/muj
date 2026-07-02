// ── STUDY RESOURCES ──────────────────────────────────────────────
// Common resource library — shared across all batches of same program+course

const PUTER_RESOURCES_ROOT = 'MujConnects/resources';

function renderResources() {
  if (!isLoggedIn()) return (location.hash = "login");
  const p = getProfile();

  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-bold">📚 Study Resources</h2>
          <p class="text-xs text-zinc-500">Shared materials for ${p.program || 'your program'} · ${p.course || 'your course'}</p>
        </div>
      </div>

      <!-- Upload section -->
      <div id="resDropZone" class="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-5 text-center mb-4 cursor-pointer hover:border-blue-400 transition-colors">
        <div class="text-3xl mb-1">📤</div>
        <p class="text-sm text-zinc-500">Upload study material — notes, papers, books</p>
        <p class="text-xs text-zinc-400 mt-1">Visible to all batches of your course · Max 50MB</p>
        <input type="file" id="resUploadInput" class="hidden" multiple />
      </div>

      <div id="resUploadProgress" class="hidden mb-3 flex items-center gap-2 text-sm text-zinc-500">
        <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span id="resUploadStatus">Uploading...</span>
      </div>

      <!-- Subject filter -->
      <div class="flex gap-2 mb-3 flex-wrap" id="subjectFilters">
        <button onclick="filterResources('')" data-filter="" class="res-filter-btn text-xs px-3 py-1 rounded-lg bg-blue-600 text-white">All</button>
        <button onclick="filterResources('notes')" data-filter="notes" class="res-filter-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📝 Notes</button>
        <button onclick="filterResources('papers')" data-filter="papers" class="res-filter-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📄 Papers</button>
        <button onclick="filterResources('books')" data-filter="books" class="res-filter-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📚 Books</button>
        <button onclick="filterResources('other')" data-filter="other" class="res-filter-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">📁 Other</button>
      </div>

      <!-- File list -->
      <div id="resList" class="space-y-2 max-h-[50vh] overflow-y-auto">
        <div class="text-sm text-zinc-400 text-center py-8">Loading resources...</div>
      </div>
    </div>
  `;

  const uploadInput = $("#resUploadInput");
  const dropZone = $("#resDropZone");

  dropZone.onclick = () => uploadInput.click();
  uploadInput.onchange = (e) => uploadResource(Array.from(e.target.files));

  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); };
  dropZone.ondragleave = () => dropZone.classList.remove('border-blue-500');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500');
    uploadResource(Array.from(e.dataTransfer.files));
  };

  loadResources('');
}

function getResourceFolder() {
  const p = getProfile();
  // Resources shared across all batches — only program+course in path
  const key = `${p.program}_${p.course}`.replace(/[^a-zA-Z0-9_]/g, '-');
  return `${PUTER_RESOURCES_ROOT}/${key}`;
}

async function uploadResource(files) {
  if (!files.length) return;
  const progressEl = $("#resUploadProgress");
  const statusEl = $("#resUploadStatus");
  progressEl.classList.remove('hidden');

  for (const file of files) {
    statusEl.textContent = `Uploading ${file.name}...`;
    try {
      const folder = getResourceFolder();
      await puter.fs.mkdir(PUTER_RESOURCES_ROOT, { createMissingParents: true }).catch(() => {});
      await puter.fs.mkdir(folder, { createMissingParents: true }).catch(() => {});
      const filePath = `${folder}/${file.name}`;
      await puter.fs.write(filePath, file, { dedupeName: true });

      // Save metadata to Firebase for search/filter
      const p = getProfile();
      const user = firebase.auth().currentUser;
      const url = await puter.fs.getReadURL(filePath);
      const category = guessCategory(file.name);
      await firebase.database().ref(`resources/${getProfile().program}_${getProfile().course}`.replace(/[^a-zA-Z0-9_]/g, '-')).push({
        name: file.name, size: file.size, url, category,
        uploadedBy: p.displayName, uid: user.uid,
        timestamp: Date.now()
      });
    } catch (err) {
      alert(`Failed to upload ${file.name}: ${err.message}`);
    }
  }
  progressEl.classList.add('hidden');
  loadResources(window._currentResFilter || '');
}

function guessCategory(filename) {
  const name = filename.toLowerCase();
  if (name.includes('note') || name.includes('notes')) return 'notes';
  if (name.includes('paper') || name.includes('pyq') || name.includes('exam')) return 'papers';
  if (name.includes('book') || name.includes('textbook') || name.endsWith('.pdf')) return 'books';
  return 'other';
}

function filterResources(cat) {
  window._currentResFilter = cat;
  document.querySelectorAll('.res-filter-btn').forEach(btn => {
    btn.dataset.filter === cat
      ? (btn.className = 'res-filter-btn text-xs px-3 py-1 rounded-lg bg-blue-600 text-white')
      : (btn.className = 'res-filter-btn text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800');
  });
  loadResources(cat);
}

function loadResources(filterCat) {
  const list = $("#resList");
  if (!list) return;
  list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-6">Loading...</div>';

  const p = getProfile();
  const resKey = `${p.program}_${p.course}`.replace(/[^a-zA-Z0-9_]/g, '-');
  let query = firebase.database().ref(`resources/${resKey}`).orderByChild('timestamp');

  query.once('value', snap => {
    if (!snap.exists()) {
      list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No resources yet. Be the first to upload! 📚</div>';
      return;
    }
    const items = [];
    snap.forEach(c => items.push({ id: c.key, ...c.val() }));
    const filtered = filterCat ? items.filter(i => i.category === filterCat) : items;
    if (!filtered.length) {
      list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No files in this category.</div>';
      return;
    }

    const user = firebase.auth().currentUser;
    list.innerHTML = filtered.reverse().map(item => {
      const icon = getFileIcon(item.name);
      const size = item.size ? formatBytes(item.size) : '';
      const catBadge = { notes: '📝 Notes', papers: '📄 Papers', books: '📚 Books', other: '📁 Other' }[item.category] || '📁';
      const isOwner = user && item.uid === user.uid;
      return `
        <div class="flex items-center gap-3 p-3 border rounded-xl dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
          <span class="text-2xl flex-shrink-0">${icon}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtmlRes(item.name)}</p>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-xs text-zinc-400">${catBadge}</span>
              ${size ? `<span class="text-xs text-zinc-400">· ${size}</span>` : ''}
              <span class="text-xs text-zinc-400">· ${escapeHtmlRes(item.uploadedBy)}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <a href="${item.url}" target="_blank" class="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 no-underline">⬇ Download</a>
            ${isOwner || isAdmin() ? `<button onclick="deleteResource('${item.id}')" class="text-xs border border-red-200 text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950">🗑</button>` : ''}
          </div>
        </div>`;
    }).join('');
  });
}

function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  const p = getProfile();
  const resKey = `${p.program}_${p.course}`.replace(/[^a-zA-Z0-9_]/g, '-');
  firebase.database().ref(`resources/${resKey}/${id}`).remove()
    .then(() => loadResources(window._currentResFilter || ''));
}

function escapeHtmlRes(text) {
  const div = document.createElement('div'); div.textContent = String(text || ''); return div.innerHTML;
}
function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const icons = { pdf:'📄', doc:'📝', docx:'📝', ppt:'📊', pptx:'📊', xls:'📈', xlsx:'📈', txt:'📃', md:'📃', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', mp4:'🎬', mp3:'🎵', zip:'🗜️', rar:'🗜️', py:'💻', java:'💻', cpp:'💻', html:'🌐' };
  return icons[ext] || '📁';
}
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}
