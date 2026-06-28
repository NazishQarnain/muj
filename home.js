function renderHome() {
  // BUG FIX: Redirect to login if not logged in
  if (!isLoggedIn()) return (location.hash = "login");

  const p = getProfile();
  // BUG FIX: Safe fallback for displayName
  const name = p.displayName && p.displayName !== "Student" ? p.displayName : (p.email ? p.email.split('@')[0] : "Student");

  $("#app").innerHTML = `
    <div class="p-6 border rounded-2xl dark:border-zinc-800">
      <h2 class="text-xl font-bold">Welcome, ${name} 👋</h2>
      <p class="text-sm text-zinc-500 mb-4">Select your batch to enter group chat:</p>
      <div class="grid sm:grid-cols-3 gap-3 mb-4">
        ${BATCHES.map(
          (b) => `
          <button data-batch="${b}" class="rounded-xl border px-3 py-2 transition-colors ${
            p.batchId === b
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }">${b}</button>`
        ).join("")}
      </div>
      <button id="goChat" class="rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors">Go to Chat →</button>
    </div>
  `;

  document.querySelectorAll("[data-batch]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const pr = getProfile();
      pr.batchId = btn.dataset.batch;
      setProfile(pr);
      renderHome();
    })
  );

  $("#goChat").onclick = () => {
    const pr = getProfile();
    if (!pr.batchId) {
      alert("Please select a batch first!");
      return;
    }
    location.hash = "chat";
  };
}

// BUG FIX: Added profile page
function renderProfile() {
  if (!isLoggedIn()) return (location.hash = "login");

  const p = getProfile();
  const user = firebase.auth().currentUser;

  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">
      <h2 class="text-xl font-bold mb-4">Your Profile</h2>
      <div class="space-y-3">
        <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
          <p class="text-xs text-zinc-500">Name</p>
          <p class="font-semibold">${p.displayName || 'Not set'}</p>
        </div>
        <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
          <p class="text-xs text-zinc-500">Email</p>
          <p class="font-semibold">${p.email || (user ? user.email : 'Not set')}</p>
        </div>
        <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
          <p class="text-xs text-zinc-500">Batch</p>
          <p class="font-semibold">${p.batchId || 'Not selected'}</p>
        </div>
      </div>
      <button onclick="logout()" class="mt-6 w-full rounded-xl border border-red-400 text-red-500 py-2 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Logout</button>
    </div>
  `;
}
