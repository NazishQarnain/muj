// ── PROFILE PAGE ─────────────────────────────────────────────────

function renderProfile() {
  if (!isLoggedIn()) return (location.hash = "login");
  const p = getProfile();
  const initials = (p.displayName || "S").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarHtml = p.photoURL
    ? `<img src="${p.photoURL}" class="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow" alt="Profile" />`
    : `<div class="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-2xl">${initials}</div>`;

  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">

      <!-- Avatar section -->
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
          ["Batch", p.batch || "Not selected"],
        ].map(([label, val]) => `
          <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
            <p class="text-xs text-zinc-500">${label}</p>
            <p class="font-medium text-sm mt-0.5">${val}</p>
          </div>`).join("")}
      </div>

      <button onclick="logout()" class="mt-5 w-full rounded-xl border border-red-400 text-red-500 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Logout</button>
    </div>
  `;

  // Avatar upload handler
  $("#avatarInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate — only images, max 5MB
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please select an image under 5MB.');
      return;
    }

    const uploadMsg = $("#uploadMsg");
    const label = $("#avatarLabel");
    uploadMsg.classList.remove('hidden');
    uploadMsg.textContent = 'Uploading...';
    label.style.pointerEvents = 'none';

    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error('Not logged in');

      // Save to Puter: MujConnects/avatars/{uid}
      await puter.fs.mkdir('MujConnects/avatars', { createMissingParents: true }).catch(() => {});
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `MujConnects/avatars/${user.uid}.${ext}`;
      await puter.fs.write(filePath, file);
      const photoURL = await puter.fs.getReadURL(filePath);

      // Save URL to Firebase
      await firebase.database().ref('users/' + user.uid + '/photoURL').set(photoURL);

      // Update local profile
      const pr = getProfile();
      pr.photoURL = photoURL;
      setProfile(pr);

      uploadMsg.textContent = '✅ Photo updated!';
      setTimeout(() => renderProfile(), 1000);
    } catch (err) {
      console.error('Avatar upload error:', err);
      uploadMsg.textContent = '❌ Upload failed: ' + err.message;
      label.style.pointerEvents = 'auto';
    }
  };
}

// ── HOME PAGE ─────────────────────────────────────────────────────

function renderHome() {
  if (!isLoggedIn()) return (location.hash = "login");

  const p = getProfile();
  const name = (p.displayName && p.displayName !== "Student")
    ? p.displayName
    : (p.email ? p.email.split('@')[0] : "Student");

  const programKeys = Object.keys(MUJ_PROGRAMS);
  const selectedProgram = p.program || "";
  const courses = selectedProgram ? MUJ_PROGRAMS[selectedProgram].courses : [];
  const batches = selectedProgram ? getBatchesForProgram(selectedProgram) : [];

  // Avatar for welcome
  const initials = (p.displayName || "S").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarHtml = p.photoURL
    ? `<img src="${p.photoURL}" class="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />`
    : `<div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-sm">${initials}</div>`;

  $("#app").innerHTML = `
    <div class="p-6 border rounded-2xl dark:border-zinc-800 space-y-5">
      <div class="flex items-center gap-3">
        ${avatarHtml}
        <div>
          <h2 class="text-xl font-bold">Welcome, ${name} 👋</h2>
          <p class="text-sm text-zinc-500">Select your program details to join your batch chat</p>
        </div>
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

      <!-- Summary -->
      ${(selectedProgram && p.course && p.batch) ? `
      <div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
        🎓 <strong>${p.program}</strong> · ${p.course} · Batch ${p.batch}
      </div>` : ""}

      <button id="goChat" class="rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        ${(selectedProgram && p.course && p.batch) ? "" : "disabled"}>
        Go to Chat →
      </button>
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

  $("#goChat").onclick = () => {
    const pr = getProfile();
    if (!pr.program || !pr.course || !pr.batch) { alert("Please select your Program, Course and Batch!"); return; }
    location.hash = "chat";
  };
}
