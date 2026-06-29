// Firebase instances
let db = null;
let auth = null;
let isFirebaseReady = false;
let authStateUnsubscribe = null;
let initializationPromise = null;

window.isLoggingOut = false;

// --------------------
// Utility Functions
// --------------------

function clearError() {
  const errorElement = document.getElementById('auth-error');
  if (errorElement) errorElement.textContent = '';
}

function showError(message, type = 'error') {
  const errorElement = document.getElementById('auth-error');
  if (!errorElement) return;

  errorElement.textContent = message;
  errorElement.style.color = type === 'success' ? 'green' : 'orange';
  errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setLoading(button, isLoading) {
  if (!button) return;

  const buttonText = button.querySelector('.button-text');
  const spinner = button.querySelector('.loading-spinner');

  if (buttonText) buttonText.style.display = isLoading ? 'none' : 'block';
  if (spinner) spinner.style.display = isLoading ? 'block' : 'none';

  button.disabled = isLoading;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function disableForms() {
  document.querySelectorAll('#login-btn, #signup-btn').forEach(btn => {
    btn.disabled = true;
  });
}

// --------------------
// Firebase Loading
// --------------------

async function ensureFirebaseLoaded() {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    return true;
  }

  return new Promise(resolve => {
    const maxWaitTime = 10000;
    const checkInterval = 100;
    let elapsedTime = 0;

    const interval = setInterval(() => {
      elapsedTime += checkInterval;

      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        clearInterval(interval);
        resolve(true);
      }

      if (elapsedTime >= maxWaitTime) {
        clearInterval(interval);
        resolve(false);
      }
    }, checkInterval);
  });
}

export async function initializeFirebase() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK not loaded');
      }

      const configResponse = await Promise.race([
        fetch('/.netlify/functions/getConfig'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Config fetch timeout')), 5000)
        )
      ]);

      if (!configResponse.ok) {
        throw new Error(`Config fetch failed: ${configResponse.status}`);
      }

      const { firebaseConfig } = await configResponse.json();

      if (!firebaseConfig?.apiKey) {
        throw new Error('Invalid Firebase configuration');
      }

      const app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      auth = firebase.auth(app);
      db = firebase.firestore(app);

      try {
        await db.enablePersistence();
        console.debug('Firestore offline persistence enabled');
      } catch (error) {
        console.warn('Firestore persistence skipped:', error.code || error.message);
      }

      isFirebaseReady = true;
      console.log('Firebase initialized successfully');

      return { auth, db };

    } catch (error) {
      isFirebaseReady = false;
      initializationPromise = null;
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

export function checkAuthReady() {
  if (!isFirebaseReady || !auth || !db) {
    throw new Error('Authentication service not ready - please wait');
  }

  return { auth, db };
}

// --------------------
// Main Initialization
// --------------------

async function initAuthSystem() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const logoutStatus = urlParams.get('logout');

    if (logoutStatus === 'success') {
      showError('You have been logged out successfully', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (logoutStatus === 'error') {
      showError('Logout failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const firebaseLoaded = await ensureFirebaseLoaded();

    if (!firebaseLoaded) {
      showError('Authentication system failed to load. Please refresh the page.');
      disableForms();
      return;
    }

    await initializeFirebase();
    setupEventListeners();
    setupAuthStateListener();

  } catch (error) {
    console.error('Auth system initialization failed:', error);
    showError('System error. Please refresh the page.');
    disableForms();
  }
}

// --------------------
// Auth State Listener
// --------------------

function setupAuthStateListener() {
  if (authStateUnsubscribe) authStateUnsubscribe();

  let isHandlingRedirect = false;
  let lastRedirectTime = 0;

  authStateUnsubscribe = auth.onAuthStateChanged(user => {
    const now = Date.now();

    if (window.isLoggingOut || isHandlingRedirect || now - lastRedirectTime < 2000) {
      return;
    }

    const currentPath = window.location.pathname
      .replace(/\/$/, '')
      .toLowerCase();

    const publicPages = ['', '/', '/index'];
    const protectedPages = ['/dashboard', '/quiz', '/payment'];

    const isPublicPage = publicPages.includes(currentPath);
    const isProtectedPage = protectedPages.includes(currentPath);

    isHandlingRedirect = true;
    lastRedirectTime = now;

    if (user && isPublicPage) {
      window.location.replace('/dashboard');
      return;
    }

    if (!user && isProtectedPage) {
      window.location.replace('/index');
      return;
    }

    setTimeout(() => {
      isHandlingRedirect = false;
    }, 1000);
  });
}

// --------------------
// Login
// --------------------

let isLoginProcessing = false;

async function handleLogin(e) {
  e.preventDefault();

  if (isLoginProcessing) return;

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');

  if (!emailInput || !passwordInput || !loginBtn) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  try {
    isLoginProcessing = true;
    setLoading(loginBtn, true);
    clearError();

    checkAuthReady();

    await auth.signInWithEmailAndPassword(email, password);

  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isLoginProcessing = false;
    setLoading(loginBtn, false);
  }
}

// --------------------
// Signup
// --------------------

let isSignupProcessing = false;

async function handleSignup(e) {
  e.preventDefault();

  if (isSignupProcessing) return;

  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');
  const firstNameInput = document.getElementById('signup-firstname');
  const lastNameInput = document.getElementById('signup-lastname');
  const signupBtn = document.getElementById('signup-btn');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (
    !emailInput ||
    !passwordInput ||
    !firstNameInput ||
    !lastNameInput ||
    !signupBtn ||
    !loginForm ||
    !signupForm
  ) {
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }

  if (!firstName || !lastName) {
    showError('Please enter your full name');
    return;
  }

  try {
    isSignupProcessing = true;
    setLoading(signupBtn, true);
    clearError();

    checkAuthReady();

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);

    await db.collection('users').doc(userCredential.user.uid).set({
      firstName,
      lastName,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    await userCredential.user.sendEmailVerification();

    showError('Signup successful! Please check your email for verification.', 'success');

    signupForm.style.display = 'none';
    loginForm.style.display = 'flex';

    emailInput.value = '';
    passwordInput.value = '';
    firstNameInput.value = '';
    lastNameInput.value = '';

  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isSignupProcessing = false;
    setLoading(signupBtn, false);
  }
}

// --------------------
// Logout
// --------------------

export async function handleLogout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const logoutBtn = document.getElementById('logout-btn');

  try {
    window.isLoggingOut = true;

    if (logoutBtn) setLoading(logoutBtn, true);

    if (!auth || !firebase.apps.length) {
      await initializeFirebase();
    }

    if (!auth) {
      throw new Error('Auth unavailable after initialization');
    }

    await auth.signOut();

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase:')) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();

    const redirectUrl = new URL('/index', window.location.origin);
    redirectUrl.searchParams.set('logout', 'success');

    window.location.replace(redirectUrl.toString());

  } catch (error) {
    console.error('Logout failed:', error);

    const redirectUrl = new URL('/index', window.location.origin);
    redirectUrl.searchParams.set('logout', 'error');
    redirectUrl.searchParams.set('code', error.code || 'internal');

    window.location.replace(redirectUrl.toString());

  } finally {
    if (logoutBtn) setLoading(logoutBtn, false);
  }
}

// --------------------
// Friendly Error Messages
// --------------------

function getFriendlyError(error) {
  const code = error?.code || error;

  switch (code) {
    case 'auth/invalid-email':
    case 'auth/invalid-email-address':
      return 'Invalid email address';

    case 'auth/user-disabled':
      return 'Account disabled by administrator';

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';

    case 'auth/operation-not-allowed':
      return 'Email/password login is disabled for this app';

    case 'auth/configuration-not-found':
      return 'Invalid Firebase configuration. Please contact support.';

    case 'auth/requires-recent-login':
      return 'Please re-authenticate to update sensitive data';

    case 'auth/provider-already-linked':
      return 'Account already connected to another provider';

    case 'auth/email-already-in-use':
      return 'Email already registered';

    case 'auth/weak-password':
      return 'Password must be at least 6 characters';

    case 'auth/network-request-failed':
      return 'Network error. Check your connection';

    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later or reset password';

    case 'auth/timeout':
      return 'Request timed out. Try again';

    default:
      console.warn('Unhandled auth error:', code);
      return typeof error === 'string'
        ? error
        : 'Something went wrong. Please try again.';
  }
}

// --------------------
// Event Listeners
// --------------------

function setupEventListeners() {
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const logoutBtn = document.getElementById('logout-btn');

  showSignup?.addEventListener('click', e => {
    e.preventDefault();
    clearError();

    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'flex';
  });

  showLogin?.addEventListener('click', e => {
    e.preventDefault();
    clearError();

    if (signupForm) signupForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'flex';
  });

  loginForm?.addEventListener('submit', handleLogin);
  signupForm?.addEventListener('submit', handleSignup);

  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
  logoutBtn?.addEventListener('click', handleLogout);
}

// --------------------
// Start App
// --------------------

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthSystem);
} else {
  initAuthSystem();
}

// --------------------
// Cleanup
// --------------------

window.addEventListener('beforeunload', () => {
  if (authStateUnsubscribe) {
    authStateUnsubscribe();
  }
});