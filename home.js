// ── PROFILE PAGE ─────────────────────────────────────────────────

function renderProfile() {
  if (!isLoggedIn()) return (location.hash = "login");
  const p = getProfile();
  const initials = (p.displayName || "S").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarHtml = p.photoURL
    ? `<img src="${p.photoURL}" class="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow" alt="Profile" />`
    : `<div class="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-2xl">${initials}</div>`;

  // Batch is locked — show lock icon if set
  const batchDisplay = p.batch
    ? `${p.batch} 🔒`
    : `<span class="text-zinc-400">Not selected</span>`;

  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">

      <!-- Avatar -->
      <div class="flex flex-col items-center mb-6">
        <div class="relative">
          ${avatarHtml}
          <label id="avatarLabel" class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow" title="Change photo">
            ✏️
            <input type="file" id="avatarInput" accept="image/*" class="hidden" />
          </label>
        </div>
        <div id="uploadMsg" class="text-xs text-zinc-400 mt-2 hidden">Uploading...</div>
        <p class="font-semibold text-base mt-3">${p.displayName || "Student"}</p>
        <p class="text-xs text-zinc-500">MUJ Student</p>
      </div>

      <!-- Info fields -->
      <div class="space-y-2">
        ${[
          ["Email", p.email || "—"],
          ["Program", p.program || "Not selected"],
          ["Course", p.course || "Not selected"],
        ].map(([label, val]) => `
          <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
            <p class="text-xs text-zinc-500">${label}</p>
            <p class="font-medium text-sm mt-0.5">${val}</p>
          </div>`).join("")}

        <!-- Batch — locked field -->
        <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
          <p class="text-xs text-zinc-500">Admission Batch</p>
          <p class="font-medium text-sm mt-0.5">${batchDisplay}</p>
          ${p.batch ? `<p class="text-xs text-zinc-400 mt-1">Batch is permanently locked. Delete account to change.</p>` : ''}
        </div>
      </div>

      <!-- Logout -->
      <button onclick="logout()" class="mt-5 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Logout</button>

      <!-- Delete Account — danger zone -->
      <div class="mt-4 border border-red-200 dark:border-red-900 rounded-xl p-4">
        <p class="text-xs font-semibold text-red-500 mb-1">⚠️ Danger Zone</p>
        <p class="text-xs text-zinc-500 mb-3">Deleting your account is permanent. All your data will be removed and you can register again with the same email.</p>
        <button id="deleteBtn" class="w-full rounded-xl bg-red-500 text-white py-2 text-sm hover:bg-red-600 transition-colors">Delete My Account</button>
      </div>
    </div>
  `;

  // Avatar upload
  $("#avatarInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return; }

    const uploadMsg = $("#uploadMsg");
    const label = $("#avatarLabel");
    uploadMsg.classList.remove('hidden');
    uploadMsg.textContent = 'Uploading...';
    label.style.pointerEvents = 'none';

    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error('Not logged in');

      await puter.fs.mkdir('MujConnects/avatars', { createMissingParents: true }).catch(() => {});
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `MujConnects/avatars/${user.uid}.${ext}`;
      await puter.fs.write(filePath, file);
      const photoURL = await puter.fs.getReadURL(filePath);

      await firebase.database().ref('users/' + user.uid + '/photoURL').set(photoURL);
      const pr = getProfile();
      pr.photoURL = photoURL;
      setProfile(pr);

      uploadMsg.textContent = '✅ Photo updated!';
      setTimeout(() => renderProfile(), 1000);
    } catch (err) {
      uploadMsg.textContent = '❌ Upload failed: ' + err.message;
      label.style.pointerEvents = 'auto';
    }
  };

  // Delete account
  $("#deleteBtn").onclick = () => deleteAccount();
}

async function deleteAccount() {
  const confirmed = confirm(
    "Are you sure you want to delete your account?\n\nThis will:\n• Delete all your account data\n• Remove you from your batch room\n• This action CANNOT be undone\n\nType OK to confirm."
  );
  if (!confirmed) return;

  const user = firebase.auth().currentUser;
  if (!user) { alert('Please login again to delete your account.'); return; }

  const btn = $("#deleteBtn");
  btn.textContent = 'Deleting...';
  btn.disabled = true;

  try {
    // 1. Delete user data from Firebase Database
    await firebase.database().ref('users/' + user.uid).remove();

    // 2. Delete Firebase Auth account
    await user.delete();

    // 3. Clear local session
    logoutSession();

    alert('Your account has been deleted. You can register again with the same email.');
    location.hash = 'register';
  } catch (err) {
    console.error('Delete account error:', err);
    if (err.code === 'auth/requires-recent-login') {
      // Firebase requires re-auth for sensitive operations
      alert('For security, please logout and login again before deleting your account.');
      btn.textContent = 'Delete My Account';
      btn.disabled = false;
    } else {
      alert('Failed to delete account: ' + err.message);
      btn.textContent = 'Delete My Account';
      btn.disabled = false;
    }
  }
}

// ── HOME PAGE ─────────────────────────────────────────────────────

function renderHome() {
  if (!isLoggedIn()) return (location.hash = "login");

  const p = getProfile();
  const name = (p.displayName && p.displayName !== "Student")
    ? p.displayName
    : (p.email ? p.email.split('@')[0] : "Student");

  const initials = (p.displayName || "S").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarHtml = p.photoURL
    ? `<img src="${p.photoURL}" class="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />`
    : `<div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-sm">${initials}</div>`;

  // LOCKED: if batch already set, skip selection and go straight to chat
  if (p.program && p.course && p.batch) {
    $("#app").innerHTML = `
      <div class="p-6 border rounded-2xl dark:border-zinc-800 space-y-4">
        <div class="flex items-center gap-3">
          ${avatarHtml}
          <div>
            <h2 class="text-xl font-bold">Welcome, ${name} 👋</h2>
            <p class="text-sm text-zinc-500">Your batch is confirmed</p>
          </div>
        </div>
        <div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-4">
          <p class="text-xs text-blue-500 font-medium mb-1">YOUR BATCH (Locked 🔒)</p>
          <p class="text-base font-bold text-blue-900 dark:text-blue-100">${p.program} · ${p.course}</p>
          <p class="text-sm text-blue-700 dark:text-blue-300">Batch ${p.batch}</p>
        </div>
        <button id="goChat" class="w-full rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
          Enter Batch Chat →
        </button>
        <p class="text-xs text-zinc-400 text-center">Wrong batch? Go to Profile → Delete Account to start over.</p>
      </div>
    `;
    $("#goChat").onclick = () => { location.hash = "chat"; };
    return;
  }

  // First time — show selection UI
  const programKeys = Object.keys(MUJ_PROGRAMS);
  const selectedProgram = p.program || "";
  const courses = selectedProgram ? MUJ_PROGRAMS[selectedProgram].courses : [];
  const batches = selectedProgram ? getBatchesForProgram(selectedProgram) : [];

  $("#app").innerHTML = `
    <div class="p-6 border rounded-2xl dark:border-zinc-800 space-y-5">
      <div class="flex items-center gap-3">
        ${avatarHtml}
        <div>
          <h2 class="text-xl font-bold">Welcome, ${name} 👋</h2>
          <p class="text-sm text-zinc-500">Choose carefully — your batch will be locked permanently</p>
        </div>
      </div>

      <div class="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-xs text-yellow-800 dark:text-yellow-200">
        ⚠️ <strong>Important:</strong> Once you confirm your batch, it cannot be changed. If you make a mistake, you'll need to delete your account and register again.
      </div>

      <!-- Program -->
      <div>
        <label class="block text-sm font-medium mb-1">Program</label>
        <select id="sel-program" class="w-full border rounded-xl px-3 py-2 bg-white dark:bg-zinc-900 text-sm">
          <option value="">-- Select Program --</option>
          ${programKeys.map(k => `<option value="${k}" ${k === selectedProgram ? "selected" : ""}>${k}</option>`).join("")}
        </select>
      </div>

      <!-- Course -->
      <div id="course-wrap" class="${selectedProgram ? "" : "hidden"}">
        <label class="block text-sm font-medium mb-1">Course / Specialisation</label>
        <select id="sel-course" class="w-full border rounded-xl px-3 py-2 bg-white dark:bg-zinc-900 text-sm">
          <option value="">-- Select Course --</option>
          ${courses.map(c => `<option value="${c}" ${c === p.course ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>

      <!-- Batch -->
      <div id="batch-wrap" class="${(selectedProgram && p.course) ? "" : "hidden"}">
        <label class="block text-sm font-medium mb-1">Admission Batch</label>
        <p class="text-xs text-zinc-400 mb-2">Choose the year you joined MUJ</p>
        <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1" id="batch-btns">
          ${batches.map(b => `
            <button data-batch="${b}" class="batch-btn rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${p.batch === b
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-700"}">
              ${b}
            </button>`).join("")}
        </div>
      </div>

      <!-- Confirm button — only show when all 3 selected -->
      ${(selectedProgram && p.course && p.batch) ? `
      <div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
        🎓 <strong>${p.program}</strong> · ${p.course} · Batch ${p.batch}
      </div>
      <button id="goChat" class="w-full rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
        Confirm & Enter Chat 🔒
      </button>` : `
      <button disabled class="w-full rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-medium opacity-50 cursor-not-allowed">
        Confirm & Enter Chat 🔒
      </button>`}
    </div>
  `;

  $("#sel-program").onchange = function () {
    const pr = getProfile(); pr.program = this.value; pr.course = ""; pr.batch = "";
    setProfile(pr); renderHome();
  };

  const selCourse = $("#sel-course");
  if (selCourse) {
    selCourse.onchange = function () {
      const pr = getProfile(); pr.course = this.value; pr.batch = "";
      setProfile(pr); renderHome();
    };
  }

  document.querySelectorAll(".batch-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pr = getProfile(); pr.batch = btn.dataset.batch;
      setProfile(pr); renderHome();
    });
  });

  const goBtn = $("#goChat");
  if (goBtn) {
    goBtn.onclick = async () => {
      const pr = getProfile();
      if (!pr.program || !pr.course || !pr.batch) { alert("Please select your Program, Course and Batch!"); return; }

      // Final confirmation before locking
      const ok = confirm(`Confirm your batch:\n\n${pr.program} — ${pr.course}\nBatch: ${pr.batch}\n\nThis CANNOT be changed later. Proceed?`);
      if (!ok) return;

      // Lock batch in Firebase too
      const user = firebase.auth().currentUser;
      if (user) {
        await firebase.database().ref('users/' + user.uid).update({
          program: pr.program,
          course: pr.course,
          batch: pr.batch,
          batchLockedAt: Date.now()
        });
      }

      location.hash = "chat";
    };
  }
}
