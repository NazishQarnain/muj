// ── LOST & FOUND ─────────────────────────────────────────────────

function renderLostFound() {
  if (!isLoggedIn()) return (location.hash = "login");
  const p = getProfile();

  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="text-lg font-bold">🔍 Lost & Found</h2>
          <p class="text-xs text-zinc-500">Campus-wide — post lost or found items</p>
        </div>
        <button onclick="showPostLF()" class="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">+ Post Item</button>
      </div>

      <!-- Post form (hidden by default) -->
      <div id="lfForm" class="hidden mb-4 border rounded-xl p-4 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 space-y-3">
        <h3 class="text-sm font-semibold">Post an Item</h3>
        <div class="flex gap-2">
          <button onclick="setLFType('lost')" id="typeLost" class="flex-1 py-2 rounded-xl text-sm font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">😢 Lost</button>
          <button onclick="setLFType('found')" id="typeFound" class="flex-1 py-2 rounded-xl text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">✅ Found</button>
        </div>
        <input id="lfTitle" placeholder="Item name (e.g. Blue Water Bottle)" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
        <textarea id="lfDesc" placeholder="Description — color, brand, where lost/found, when..." rows="3" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm resize-none"></textarea>
        <input id="lfLocation" placeholder="Location (e.g. Library, Block A Cafeteria)" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
        <input id="lfContact" placeholder="Contact (WhatsApp number or email)" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
        <div class="flex gap-2 justify-end">
          <button onclick="hideLFForm()" class="px-4 py-2 text-sm border rounded-xl dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
          <button onclick="submitLFPost()" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">Post</button>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2 mb-3">
        <button onclick="filterLF('all')" data-lf="all" class="lf-filter text-xs px-3 py-1 rounded-lg bg-blue-600 text-white">All</button>
        <button onclick="filterLF('lost')" data-lf="lost" class="lf-filter text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">😢 Lost</button>
        <button onclick="filterLF('found')" data-lf="found" class="lf-filter text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">✅ Found</button>
        <button onclick="filterLF('resolved')" data-lf="resolved" class="lf-filter text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">🎉 Resolved</button>
      </div>

      <!-- Posts list -->
      <div id="lfList" class="space-y-3 max-h-[60vh] overflow-y-auto">
        <div class="text-sm text-zinc-400 text-center py-8">Loading...</div>
      </div>
    </div>
  `;

  window._lfType = 'lost';
  loadLFPosts('all');
}

function showPostLF() {
  $("#lfForm").classList.remove('hidden');
  $("#lfTitle").focus();
}
function hideLFForm() { $("#lfForm").classList.add('hidden'); }

function setLFType(type) {
  window._lfType = type;
  const lostBtn = $("#typeLost");
  const foundBtn = $("#typeFound");
  if (type === 'lost') {
    lostBtn.className = 'flex-1 py-2 rounded-xl text-sm font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
    foundBtn.className = 'flex-1 py-2 rounded-xl text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800';
  } else {
    foundBtn.className = 'flex-1 py-2 rounded-xl text-sm font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
    lostBtn.className = 'flex-1 py-2 rounded-xl text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800';
  }
}

function submitLFPost() {
  const title = $("#lfTitle").value.trim();
  const desc = $("#lfDesc").value.trim();
  const location = $("#lfLocation").value.trim();
  const contact = $("#lfContact").value.trim();

  if (!title || !desc || !contact) {
    alert('Please fill in item name, description, and contact.');
    return;
  }

  const user = firebase.auth().currentUser;
  const p = getProfile();

  firebase.database().ref('lostandfound').push({
    type: window._lfType || 'lost',
    title, desc, location, contact,
    status: 'active',
    postedBy: p.displayName,
    uid: user.uid,
    timestamp: Date.now()
  }).then(() => {
    hideLFForm();
    // Clear form
    ["lfTitle","lfDesc","lfLocation","lfContact"].forEach(id => { const el = $(`#${id}`); if(el) el.value = ''; });
    loadLFPosts(window._lfFilter || 'all');
  }).catch(err => alert('Failed to post: ' + err.message));
}

function filterLF(type) {
  window._lfFilter = type;
  document.querySelectorAll('.lf-filter').forEach(btn => {
    btn.dataset.lf === type
      ? (btn.className = 'lf-filter text-xs px-3 py-1 rounded-lg bg-blue-600 text-white')
      : (btn.className = 'lf-filter text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800');
  });
  loadLFPosts(type);
}

function loadLFPosts(filter) {
  const list = $("#lfList");
  if (!list) return;
  list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-6">Loading...</div>';

  firebase.database().ref('lostandfound').orderByChild('timestamp').once('value', snap => {
    if (!snap.exists()) {
      list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-10">No posts yet. Be the first to post! 🔍</div>';
      return;
    }
    const items = [];
    snap.forEach(c => items.push({ id: c.key, ...c.val() }));

    const filtered = filter === 'all' ? items : items.filter(i =>
      filter === 'resolved' ? i.status === 'resolved' : (i.type === filter && i.status !== 'resolved')
    );

    if (!filtered.length) {
      list.innerHTML = '<div class="text-sm text-zinc-400 text-center py-10">No posts in this category.</div>';
      return;
    }

    const user = firebase.auth().currentUser;
    list.innerHTML = filtered.reverse().map(item => {
      const isOwner = user && item.uid === user.uid;
      const isResolved = item.status === 'resolved';
      const typeColor = isResolved
        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
        : item.type === 'lost'
          ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      const typeBadge = isResolved ? '🎉 Resolved' : item.type === 'lost' ? '😢 Lost' : '✅ Found';
      const date = new Date(item.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short' });

      return `
        <div class="border rounded-xl p-4 ${typeColor}">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${isResolved ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : item.type === 'lost' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'}">${typeBadge}</span>
              <h3 class="text-sm font-semibold">${escapeHtmlLF(item.title)}</h3>
            </div>
            <span class="text-xs text-zinc-400 flex-shrink-0">${date}</span>
          </div>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-2">${escapeHtmlLF(item.desc)}</p>
          ${item.location ? `<p class="text-xs text-zinc-500">📍 ${escapeHtmlLF(item.location)}</p>` : ''}
          <p class="text-xs text-zinc-500 mt-1">📞 ${escapeHtmlLF(item.contact)}</p>
          <p class="text-xs text-zinc-400 mt-1">Posted by ${escapeHtmlLF(item.postedBy)}</p>
          ${(isOwner || isAdmin()) && !isResolved ? `
          <div class="flex gap-2 mt-3">
            <button onclick="markResolved('${item.id}')" class="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">🎉 Mark Resolved</button>
            <button onclick="deleteLFPost('${item.id}')" class="text-xs border border-red-200 text-red-500 px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950">🗑 Delete</button>
          </div>` : ''}
        </div>`;
    }).join('');
  });
}

function markResolved(id) {
  firebase.database().ref(`lostandfound/${id}`).update({ status: 'resolved' })
    .then(() => loadLFPosts(window._lfFilter || 'all'));
}

function deleteLFPost(id) {
  if (!confirm('Delete this post?')) return;
  firebase.database().ref(`lostandfound/${id}`).remove()
    .then(() => loadLFPosts(window._lfFilter || 'all'));
}

function escapeHtmlLF(text) {
  const div = document.createElement('div'); div.textContent = String(text || ''); return div.innerHTML;
}
