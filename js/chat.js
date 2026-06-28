// Firebase Real-time Chat Functionality

let messagesRef;

function renderChat() {
  const p = getProfile();
  if (!isLoggedIn()) return (location.hash = "login");
  
  const b = p.batchId || "2025-2026";
  const sanitizedBatch = b.replace(/[.#$\[\]]/g, '-'); // Firebase doesn't allow these chars
  
  $("#app").innerHTML = `
    <div class="border rounded-2xl p-4 dark:border-zinc-800">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-bold">Batch Chat (${b})</h3>
        <span class="text-sm text-zinc-500">Logged in as ${p.displayName || p.email}</span>
      </div>
      <div id="chatBox" class="h-[60vh] overflow-y-auto border rounded-xl p-3 mb-2 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div class="text-sm text-zinc-500">[System] Loading messages...</div>
      </div>
      <div class="flex gap-2">
        <input id="msgInput" placeholder="Type a message..." class="flex-1 border rounded-xl px-3 py-2 dark:bg-zinc-900" />
        <button id="sendBtn" class="rounded-xl bg-blue-600 text-white px-4 py-2">Send</button>
      </div>
    </div>
  `;
  
  // Reference to the batch's messages in Firebase
  messagesRef = firebase.database().ref('chats/' + sanitizedBatch + '/messages');
  
  // Load existing messages
  loadMessages();
  
  // Send message handler
  $("#sendBtn").onclick = sendMessage;
  $("#msgInput").onkeypress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
}

function loadMessages() {
  const chatBox = $("#chatBox");
  chatBox.innerHTML = ''; // Clear loading message
  
  // Listen for new messages in real-time
  messagesRef.limitToLast(50).on('child_added', (snapshot) => {
    const msgData = snapshot.val();
    displayMessage(msgData);
  });
}

function sendMessage() {
  const msgInput = $("#msgInput");
  const val = msgInput.value.trim();
  if (!val) return;
  
  const p = getProfile();
  const user = firebase.auth().currentUser;
  
  if (!user) {
    alert('You must be logged in to send messages');
    return;
  }
  
  // Create message object
  const messageData = {
    text: val,
    displayName: p.displayName || user.displayName || 'Anonymous',
    email: user.email,
    uid: user.uid,
    timestamp: Date.now()
  };
  
  // Push to Firebase
  messagesRef.push(messageData)
    .then(() => {
      msgInput.value = ''; // Clear input
    })
    .catch((error) => {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    });
}

function displayMessage(msgData) {
  const chatBox = $("#chatBox");
  const msg = document.createElement("div");
  const currentUser = firebase.auth().currentUser;
  const isOwnMessage = currentUser && msgData.uid === currentUser.uid;
  
  msg.className = isOwnMessage 
    ? "mt-2 bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-xl ml-auto max-w-[70%]"
    : "mt-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl max-w-[70%]";
  
  // Format timestamp
  const date = new Date(msgData.timestamp);
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  msg.innerHTML = `
    <div class="text-xs font-semibold mb-1">${msgData.displayName}</div>
    <div class="text-sm">${escapeHtml(msgData.text)}</div>
    <div class="text-xs text-zinc-500 mt-1">${timeStr}</div>
  `;
  
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup when leaving chat
function cleanupChat() {
  if (messagesRef) {
    messagesRef.off(); // Remove listeners
  }
}
