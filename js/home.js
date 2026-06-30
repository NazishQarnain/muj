function renderHome() {
  if (!isLoggedIn()) return (location.hash = "login");

  const p = getProfile();
  const name = (p.displayName && p.displayName !== "Student")
    ? p.displayName
    : (p.email ? p.email.split('@')[0] : "Student");

  const programKeys = Object.keys(MUJ_PROGRAMS);
  const selectedProgram = p.program || "";
  const courses = selectedProgram ? MUJ_PROGRAMS[selectedProgram].courses : [];
  const years = selectedProgram ? getYearsForProgram(selectedProgram) : [];

  $("#app").innerHTML = `
    <div class="p-6 border rounded-2xl dark:border-zinc-800 space-y-5">
      <div>
        <h2 class="text-xl font-bold">Welcome, ${name} 👋</h2>
        <p class="text-sm text-zinc-500 mt-1">Select your program details to join your batch chat</p>
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

      <!-- Year -->
      <div id="year-wrap" class="${(selectedProgram && p.course) ? "" : "hidden"}">
        <label class="block text-sm font-medium mb-1">Year</label>
        <div class="flex flex-wrap gap-2" id="year-btns">
          ${years.map(y => `
            <button data-year="${y}" class="year-btn rounded-xl border px-4 py-2 text-sm transition-colors ${p.year === y ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}">
              ${y}
            </button>`).join("")}
        </div>
      </div>

      <!-- Summary badge -->
      ${(selectedProgram && p.course && p.year) ? `
      <div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
        📚 <strong>${p.program}</strong> · ${p.course} · ${p.year}
      </div>` : ""}

      <button id="goChat" class="rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors ${(selectedProgram && p.course && p.year) ? "" : "opacity-50 cursor-not-allowed"}">
        Go to Chat →
      </button>
    </div>
  `;

  // Program change
  $("#sel-program").onchange = function () {
    const pr = getProfile();
    pr.program = this.value;
    pr.course = "";
    pr.year = "";
    setProfile(pr);
    renderHome();
  };

  // Course change
  const selCourse = $("#sel-course");
  if (selCourse) {
    selCourse.onchange = function () {
      const pr = getProfile();
      pr.course = this.value;
      pr.year = "";
      setProfile(pr);
      renderHome();
    };
  }

  // Year buttons
  document.querySelectorAll(".year-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pr = getProfile();
      pr.year = btn.dataset.year;
      setProfile(pr);
      renderHome();
    });
  });

  $("#goChat").onclick = () => {
    const pr = getProfile();
    if (!pr.program || !pr.course || !pr.year) {
      alert("Please select your Program, Course and Year first!");
      return;
    }
    location.hash = "chat";
  };
}

function renderProfile() {
  if (!isLoggedIn()) return (location.hash = "login");
  const p = getProfile();
  const initials = (p.displayName || "S").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200 text-lg">${initials}</div>
        <div>
          <p class="font-semibold text-base">${p.displayName || "Student"}</p>
          <p class="text-xs text-zinc-500">MUJ Student</p>
        </div>
      </div>
      <div class="space-y-2">
        ${[
          ["Email", p.email || "—"],
          ["Program", p.program || "Not selected"],
          ["Course", p.course || "Not selected"],
          ["Year", p.year || "Not selected"],
        ].map(([label, val]) => `
          <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
            <p class="text-xs text-zinc-500">${label}</p>
            <p class="font-medium text-sm mt-0.5">${val}</p>
          </div>`).join("")}
      </div>
      <button onclick="logout()" class="mt-5 w-full rounded-xl border border-red-400 text-red-500 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Logout</button>
    </div>
  `;
}
