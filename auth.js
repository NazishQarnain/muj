// Firebase Authentication Functions

function renderLogin() {
  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">
      <h2 class="text-xl font-bold mb-3">Login</h2>
      <form id="loginForm" class="space-y-3">
        <input id="email" type="email" placeholder="College Email" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <input id="pass" type="password" placeholder="Password" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <button type="submit" class="w-full rounded-xl bg-blue-600 text-white py-2">Login</button>
        <p class="text-center text-sm text-zinc-500">No account? <a href="#register" class="underline">Register</a></p>
      </form>
      <div id="errorMsg" class="text-red-500 text-sm mt-2 hidden"></div>
    </div>
  `;

  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value;
    const password = $("#pass").value;
    const errorMsg = $("#errorMsg");
    errorMsg.classList.add('hidden');

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      const p = getProfile();
      p.email = user.email;
      p.uid = user.uid;
      p.displayName = user.displayName || p.displayName || "Student";
      setProfile(p);
      loginSession(email);

      location.hash = "home";
    } catch (error) {
      console.error('Login error:', error);
      errorMsg.classList.remove('hidden');
      // BUG FIX: Show friendly error messages
      errorMsg.textContent = getFriendlyError(error.code);
    }
  };
}

function renderRegister() {
  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">
      <h2 class="text-xl font-bold mb-3">Register</h2>
      <p class="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 rounded-xl px-3 py-2">Only MUJ students can register (@muj.manipal.edu)</p>
      <form id="regForm" class="space-y-3 mt-3">
        <input id="name" placeholder="Full Name" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <input id="email" type="email" placeholder="2023ucs1234@muj.manipal.edu" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <input id="pass" type="password" placeholder="Password (min 6 characters)" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <button type="submit" class="w-full rounded-xl bg-blue-600 text-white py-2">Register</button>
        <p class="text-center text-sm text-zinc-500">Already have account? <a href="#login" class="underline">Login</a></p>
      </form>
      <div id="errorMsg" class="text-red-500 text-sm mt-2 hidden"></div>
    </div>
  `;

  $("#regForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#pass").value;
    const errorMsg = $("#errorMsg");
    errorMsg.classList.add('hidden');

    // MUJ email validation
    if (!email.endsWith('@muj.manipal.edu')) {
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = 'Only MUJ college emails are allowed (@muj.manipal.edu).';
      return;
    }

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      await user.updateProfile({ displayName: name });

      await firebase.database().ref('users/' + user.uid).set({
        displayName: name,
        email: email,

        createdAt: Date.now()
      });

      const p = getProfile();
      p.displayName = name;
      p.email = email;

      p.uid = user.uid;
      setProfile(p);
      loginSession(email);

      location.hash = "home";
    } catch (error) {
      console.error('Registration error:', error);
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = getFriendlyError(error.code);
    }
  };
}

// BUG FIX: Proper logout that calls Firebase signOut AND clears session
function logout() {
  firebase.auth().signOut().then(() => {
    logoutSession();
    location.hash = "login";
  }).catch((error) => {
    console.error('Logout error:', error);
    // Even if signOut fails, clear local session
    logoutSession();
    location.hash = "login";
  });
}

// BUG FIX: Friendly error messages instead of raw Firebase errors
function getFriendlyError(code) {
  const messages = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}

// BUG FIX: Only attach onAuthStateChanged AFTER Firebase is initialized
// This is now called from main.js after initializeFirebase()
function setupAuthListener() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Sync displayName from Firebase if local profile is missing it
      const p = getProfile();
      if (!p.displayName || p.displayName === 'Student') {
        p.displayName = user.displayName || user.email.split('@')[0];
        setProfile(p);
      }
    }
  });
}

window.logout = logout;
window.setupAuthListener = setupAuthListener;
