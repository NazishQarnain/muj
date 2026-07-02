// Firebase Authentication Functions

function renderLogin() {
  $("#app").innerHTML = `
    <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800">
      <h2 class="text-xl font-bold mb-3">Login</h2>
      <form id="loginForm" class="space-y-3">
        <input id="email" type="email" placeholder="College Email (@muj.manipal.edu)" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <input id="pass" type="password" placeholder="Password" class="w-full border rounded-xl px-3 py-2 dark:bg-zinc-900" required />
        <button type="submit" class="w-full rounded-xl bg-blue-600 text-white py-2">Login</button>
        <p class="text-right text-xs text-zinc-400"><span class="underline cursor-pointer hover:text-zinc-600" id="forgotLink">Forgot password?</span></p>
        <p class="text-center text-sm text-zinc-500">No account? <a href="#register" class="underline">Register</a></p>
      </form>
      <div id="errorMsg" class="text-red-500 text-sm mt-2 hidden"></div>
    </div>
  `;

  // Login form submit
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value;
    const password = $("#pass").value;
    const errorMsg = $("#errorMsg");
    errorMsg.classList.add('hidden');
    errorMsg.style.color = '';

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Block login if email not verified
      if (!user.emailVerified) {
        await firebase.auth().signOut();
        errorMsg.classList.remove('hidden');
        errorMsg.innerHTML = `Email not verified. <button id="resendBtn" class="underline text-blue-600">Resend verification email</button>`;
        document.getElementById('resendBtn').onclick = async () => {
          try {
            const tempCred = await firebase.auth().signInWithEmailAndPassword(email, password);
            await tempCred.user.sendEmailVerification();
            await firebase.auth().signOut();
            errorMsg.textContent = 'Verification email resent! Check your inbox.';
          } catch(err) {
            errorMsg.textContent = getFriendlyError(err.code);
          }
        };
        return;
      }

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
      errorMsg.textContent = getFriendlyError(error.code);
    }
  };

  // Forgot password handler
  $("#forgotLink").onclick = async () => {
    const email = $("#email").value.trim();
    const errorMsg = $("#errorMsg");
    errorMsg.style.color = '';

    if (!email) {
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = 'Please enter your MUJ email above first.';
      return;
    }
    if (!email.endsWith('@muj.manipal.edu')) {
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = 'Only @muj.manipal.edu emails are supported.';
      return;
    }
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      errorMsg.classList.remove('hidden');
      errorMsg.style.color = '#16a34a';
      errorMsg.textContent = '✅ Password reset link sent! Check your MUJ inbox.';
    } catch (err) {
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = getFriendlyError(err.code);
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

      // Send verification email, then sign out immediately
      await user.sendEmailVerification();
      await firebase.auth().signOut();

      $("#app").innerHTML = `
        <div class="max-w-md mx-auto p-6 border rounded-2xl dark:border-zinc-800 text-center">
          <div class="text-5xl mb-4">📧</div>
          <h2 class="text-xl font-bold mb-2">Verify Your Email</h2>
          <p class="text-sm text-zinc-500 mb-4">
            A verification link has been sent to<br/>
            <strong class="text-zinc-800 dark:text-zinc-200">${email}</strong>
          </p>
          <p class="text-sm text-zinc-500 mb-6">Click the link in the email to activate your account, then come back and login.</p>
          <a href="#login" class="inline-block rounded-xl bg-blue-600 text-white px-6 py-2 text-sm hover:bg-blue-700 transition-colors">Go to Login</a>
          <p class="text-xs text-zinc-400 mt-4">Didn't receive? Check your spam folder.</p>
        </div>
      `;
    } catch (error) {
      console.error('Registration error:', error);
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = getFriendlyError(error.code);
    }
  };
}

function logout() {
  firebase.auth().signOut().then(() => {
    logoutSession();
    location.hash = "login";
  }).catch(() => {
    logoutSession();
    location.hash = "login";
  });
}

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

function setupAuthListener() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      const p = getProfile();
      let changed = false;

      if (!p.displayName || p.displayName === 'Student') {
        p.displayName = user.displayName || user.email.split('@')[0];
        changed = true;
      }

      try {
        const snap = await firebase.database().ref('users/' + user.uid).once('value');
        const data = snap.val() || {};
        if (data.photoURL && !p.photoURL) { p.photoURL = data.photoURL; changed = true; }
        if (data.batch && !p.batch) {
          p.program = data.program; p.course = data.course; p.batch = data.batch;
          changed = true;
        }
      } catch(e) {}

      if (changed) setProfile(p);
    }
  });
}

window.logout = logout;
window.setupAuthListener = setupAuthListener;
