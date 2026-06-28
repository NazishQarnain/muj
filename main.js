function renderNavbar() {
  const nav = $("#navbar");
  const mobileNav = $("#mobileNav");
  if (!nav) return;

  const links = isLoggedIn()
    ? [["Home", "#home"], ["Chat", "#chat"], ["Profile", "#profile"]]
    : [["Home", "#home"]];

  const authLinks = isLoggedIn()
    ? `<button id="logoutBtn" class="navlink text-red-500">Logout</button>`
    : `<a href="#login" class="navlink">Login</a><a href="#register" class="navlink">Register</a>`;

  const linkHtml = links.map((l) => `<a href="${l[1]}" class="navlink">${l[0]}</a>`).join("");

  nav.innerHTML = linkHtml + authLinks;
  if (mobileNav) mobileNav.innerHTML = linkHtml + authLinks;

  // BUG FIX: Logout now calls Firebase signOut via auth.js logout()
  const logoutBtn = document.querySelectorAll("#logoutBtn");
  logoutBtn.forEach(btn => btn.addEventListener("click", logout));

  // BUG FIX: Active navlink highlight
  const currentHash = location.hash || "#home";
  document.querySelectorAll(".navlink").forEach(link => {
    if (link.getAttribute("href") === currentHash) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// BUG FIX: Mobile menu toggle
function setupMobileMenu() {
  const menuBtn = $("#menuBtn");
  const mobileNav = $("#mobileNav");
  if (menuBtn && mobileNav) {
    menuBtn.onclick = () => {
      mobileNav.classList.toggle("hidden");
    };
  }
}

function router() {
  renderNavbar();

  // Close mobile menu on navigation
  const mobileNav = $("#mobileNav");
  if (mobileNav) mobileNav.classList.add("hidden");

  const page = location.hash.replace("#", "") || "home";
  if (page === "login") renderLogin();
  else if (page === "register") renderRegister();
  else if (page === "chat") renderChat();
  else if (page === "profile") renderProfile();
  else renderHome();
}

window.addEventListener("hashchange", router);

// BUG FIX: year and init run after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();
  setupAuthListener(); // safe to call after Firebase init
  setupMobileMenu();

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  router();
});
