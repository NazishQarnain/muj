let messagesRef;

function renderChat() {
  const p = getProfile();
  if (!isLoggedIn()) return (location.hash = "login");
  if (!p.program || !p.course || !p.year) return (location.hash = "home");

  const roomKey = buildRoomKey(p.program, p.course, p.year);
  const roomLabel = `${p.program} · ${p.course} · ${p.year}`;

  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">
      <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 class="text-base font-bold">${roomLabel}</h3>
          <p class="text-xs text-zinc-500">Group Chat</p>
        </div>
        <span class="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">${p.displayName || p.email}</span>
      </div>
      <div id="chatBox" class="h-[60vh] overflow-y-auto border rounded-xl p-3 mb-2 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div class="text-sm text-zinc-400 text-center py-4">Loading messages...</div>
      </div>
      <div class="flex gap-2">
        <input id="msgInput" placeholder="Type a message..." class="flex-1 border rounded-xl px-3 py-2 dark:bg-zinc-900 text-sm" />
        <button id="sendBtn" class="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors">Send</button>
      </div>
    </div>
  `;

  // Cleanup previous listener
  if (messagesRef) messagesRef.off();

  messagesRef = firebase.database().ref('chats/' + roomKey + '/messages');
  loadMessages();

  $("#sendBtn").onclick = sendMessage;
  $("#msgInput").onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
}

function loadMessages() {
  const chatBox = $("#chatBox");
  chatBox.innerHTML = '';

  messagesRef.limitToLast(80).on('child_added', (snapshot) => {
    displayMessage(snapshot.val());
  });

  // Show empty state if no messages after short delay
  setTimeout(() => {
    if (chatBox.children.length === 0) {
      chatBox.innerHTML = '<div class="text-sm text-zinc-400 text-center py-8">No messages yet. Say hello! 👋</div>';
    }
  }, 2000);
}

function sendMessage() {
  const msgInput = $("#msgInput");
  const val = msgInput.value.trim();
  if (!val) return;

  const p = getProfile();
  const user = firebase.auth().currentUser;
  if (!user) { alert('Please login again.'); return; }

  // Remove empty state placeholder if present
  const chatBox = $("#chatBox");
  const placeholder = chatBox.querySelector('.text-zinc-400');
  if (placeholder) placeholder.remove();

  const messageData = {
    text: val,
    displayName: p.displayName || user.displayName || 'Student',
    email: user.email,
    uid: user.uid,
    program: p.program,
    course: p.course,
    year: p.year,
    timestamp: Date.now()
  };

  messagesRef.push(messageData)
    .then(() => { msgInput.value = ''; })
    .catch((error) => { alert('Failed to send: ' + error.message); });
}

function displayMessage(msgData) {
  const chatBox = $("#chatBox");
  const currentUser = firebase.auth().currentUser;
  const isOwn = currentUser && msgData.uid === currentUser.uid;

  const msg = document.createElement("div");
  msg.className = isOwn
    ? "mt-2 flex flex-col items-end"
    : "mt-2 flex flex-col items-start";

  const date = new Date(msgData.timestamp);
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  msg.innerHTML = `
    <div class="text-xs font-semibold mb-1 text-zinc-500 px-1">${isOwn ? 'You' : escapeHtml(msgData.displayName)}</div>
    <div class="${isOwn ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'} px-3 py-2 rounded-2xl ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} max-w-[75%] text-sm leading-relaxed">
      ${escapeHtml(msgData.text)}
    </div>
    <div class="text-[10px] text-zinc-400 mt-1 px-1">${timeStr}</div>
  `;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function cleanupChat() {
  if (messagesRef) messagesRef.off();
}
