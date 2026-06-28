const $ = (sel) => document.querySelector(sel);

const LS = {
  theme: "mujc_theme",
  session: "mujc_session",
  profile: "mujc_profile",
  msgs: (b) => `mujc_msgs_${b}`,
};

const BATCHES = [
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
];

function getProfile() {
  const raw = localStorage.getItem(LS.profile);
  return raw
    ? JSON.parse(raw)
    : { displayName: "Student", email: "", batchId: "" };
}

function setProfile(p) {
  localStorage.setItem(LS.profile, JSON.stringify(p));
}

function loginSession(email) {
  localStorage.setItem(LS.session, email);
}

function logoutSession() {
  localStorage.removeItem(LS.session);
}

function isLoggedIn() {
  return !!localStorage.getItem(LS.session);
}
