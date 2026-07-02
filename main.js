function renderNavbar() {
  const nav = $("#navbar");
  const mobileNav = $("#mobileNav");
  if (!nav) return;

  // Dark mode toggle button
  const isDark = getTheme() === 'dark';
  const themeBtn = `<button id="themeBtn" title="Toggle dark mode" class="navlink text-lg leading-none">${isDark ? '☀️' : '🌙'}</button>`;

  const links = isLoggedIn()
    ? [["Home", "#home"], ["Chat", "#chat"], ["Resources", "#resources"], ["Lost & Found", "#lostandfound"], ["Profile", "#profile"]]
    : [];

  const authLinks = isLoggedIn()
    ? `<button id="logoutBtn" class="navlink text-red-500 text-sm">Logout</button>`
    : `<a href="#login" class="navlink text-sm">Login</a><a href="#register" class="navlink text-sm">Register</a>`;

  const linkHtml = links.map((l) => `<a href="${l[1]}" class="navlink text-sm">${l[0]}</a>`).join("");

  nav.innerHTML = linkHtml + authLinks + themeBtn;
  if (mobileNav) mobileNav.innerHTML = linkHtml + authLinks + themeBtn;

  document.querySelectorAll("#logoutBtn").forEach(btn => btn.addEventListener("click", logout));
  document.querySelectorAll("#themeBtn").forEach(btn => btn.addEventListener("click", () => { toggleTheme(); renderNavbar(); }));

  const currentHash = location.hash || "#home";
  document.querySelectorAll(".navlink[href]").forEach(link => {
    link.getAttribute("href") === currentHash
      ? link.classList.add("active")
      : link.classList.remove("active");
  });
}

function setupMobileMenu() {
  const menuBtn = $("#menuBtn");
  const mobileNav = $("#mobileNav");
  if (menuBtn && mobileNav) {
    menuBtn.onclick = () => mobileNav.classList.toggle("hidden");
  }
}

function router() {
  renderNavbar();
  if (typeof cleanupChat === 'function') cleanupChat();
  const mobileNav = $("#mobileNav");
  if (mobileNav) mobileNav.classList.add("hidden");

  const page = location.hash.replace("#", "") || "home";
  if (page === "login") renderLogin();
  else if (page === "register") renderRegister();
  else if (page === "chat") renderChat();
  else if (page === "profile") renderProfile();
  else if (page === "resources") renderResources();
  else if (page === "lostandfound") renderLostFound();
  else if (page === "announcements") renderAnnouncements();
  else renderHome();
}

window.addEventListener("hashchange", router);

window.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();
  applyTheme();
  setupAuthListener();
  setupMobileMenu();
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  router();
});
