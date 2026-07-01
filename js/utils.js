const $ = (sel) => document.querySelector(sel);

const LS = {
  theme: "mujc_theme",
  session: "mujc_session",
  profile: "mujc_profile",
};

// MUJ complete program data
const MUJ_PROGRAMS = {
  "B.Tech": {
    duration: 4,
    courses: [
      "CSE", "CSE (AI & ML)", "CSE (Data Science)", "CSE (Cyber Security)",
      "CSE (IoT & IS)", "CSE (CCE)", "CSE (Biosciences)",
      "Information Technology", "Mechanical Engineering", "Civil Engineering",
      "Electrical Engineering", "Electronics & Communication Engineering",
      "Mechatronics Engineering", "Biotechnology", "Chemical Engineering",
      "Robotics & AI", "Fashion Technology",
    ],
  },
  "M.Tech": {
    duration: 2,
    courses: [
      "CSE", "Cyber Security", "Computational Biology",
      "Structural Engineering", "Mechanical Engineering",
    ],
  },
  "BCA": { duration: 3, courses: ["BCA"] },
  "MCA": { duration: 2, courses: ["MCA"] },
  "BBA": {
    duration: 3,
    courses: ["BBA", "BBA (Business Analytics)"],
  },
  "MBA": {
    duration: 2,
    courses: [
      "MBA (General)", "MBA (Business Analytics)",
      "MBA (Real Estate Management)", "MBA (Finance)", "MBA (Marketing)",
    ],
  },
  "Integrated MBA": { duration: 5, courses: ["Integrated MBA"] },
  "B.Com": {
    duration: 3,
    courses: ["B.Com (Hons.)", "B.Com (Hons.) FinTech", "B.Com (Hons.) Accounting (ACCA)"],
  },
  "M.Com": { duration: 2, courses: ["M.Com (Financial Analysis)"] },
  "B.Sc": {
    duration: 3,
    courses: [
      "B.Sc (Biotechnology)", "B.Sc (Microbiology)",
      "B.Sc (Physics)", "B.Sc (Chemistry)", "B.Sc (Mathematics)",
      "B.Sc (Food Science & Technology)",
    ],
  },
  "M.Sc": {
    duration: 2,
    courses: [
      "M.Sc (Biotechnology)", "M.Sc (Chemistry)", "M.Sc (Mathematics)",
      "M.Sc (Mathematics & Computing)", "M.Sc (Physics)",
      "M.Sc (Food Science & Technology)", "M.Sc (Cyber Security)",
    ],
  },
  "B.Arch": { duration: 5, courses: ["B.Arch"] },
  "M.Arch": { duration: 2, courses: ["M.Arch"] },
  "B.Des": {
    duration: 4,
    courses: [
      "B.Des (Interior Design)", "B.Des (Fashion Design)",
      "B.Des (Communication Design)", "B.Des (Interaction Design)",
    ],
  },
  "M.Des": { duration: 2, courses: ["M.Des (Fashion Design)", "M.Des (Interior Design)"] },
  "BFA": { duration: 4, courses: ["BFA (Applied Arts)"] },
  "LLB": { duration: 3, courses: ["LLB (Hons.)"] },
  "LLM": { duration: 1, courses: ["LLM"] },
  "BA": {
    duration: 3,
    courses: [
      "BA (Hons.) English", "BA (Hons.) Economics",
      "BA (Hons.) Psychology", "BA (Liberal Arts)",
      "BA (Journalism & Mass Communication)",
    ],
  },
  "MA": { duration: 2, courses: ["MA (Economics)", "MA (JMC)"] },
  "BHM": { duration: 4, courses: ["BHM (Hotel Management)"] },
  "B.Pharm": { duration: 4, courses: ["B.Pharm"] },
  "BPEd": { duration: 4, courses: ["BPEd (Physical Education & Sports)"] },
  "Ph.D": {
    duration: 3,
    courses: [
      "Ph.D (Engineering)", "Ph.D (Management)", "Ph.D (Sciences)",
      "Ph.D (Humanities)", "Ph.D (Law)", "Ph.D (Design)",
    ],
  },
};

// Generate admission year batches based on program duration
// Shows ALL batches from MUJ founding (2011) to current year
// so passout students can still access their batch room forever
function getBatchesForProgram(programKey) {
  const prog = MUJ_PROGRAMS[programKey];
  if (!prog) return [];
  const currentYear = new Date().getFullYear();
  const MUJ_FOUNDING = 2011; // MUJ established 2011
  const batches = [];
  for (let start = MUJ_FOUNDING; start <= currentYear; start++) {
    batches.push(`${start}–${start + prog.duration}`);
  }
  // Newest first — current students see their batch at top
  return batches.reverse();
}

// Build a unique chat room key from program + course + batch
function buildRoomKey(program, course, batch) {
  return [program, course, batch]
    .join("_")
    .replace(/[^a-zA-Z0-9_\-]/g, "-");
}

function getProfile() {
  const raw = localStorage.getItem(LS.profile);
  return raw
    ? JSON.parse(raw)
    : { displayName: "Student", email: "", program: "", course: "", batch: "" };
}

function setProfile(p) {
  localStorage.setItem(LS.profile, JSON.stringify(p));
}

function loginSession(email) {
  localStorage.setItem(LS.session, email);
}

function logoutSession() {
  localStorage.removeItem(LS.session);
  localStorage.removeItem(LS.profile);
}

function isLoggedIn() {
  return !!localStorage.getItem(LS.session);
}
