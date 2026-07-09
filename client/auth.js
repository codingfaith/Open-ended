// Firebase instances
let db = null;
let auth = null;
let isFirebaseReady = false;
let authStateUnsubscribe = null;
let initializationPromise = null;

// At the top of your script
if (typeof firebase === 'undefined') {
  console.warn('Firebase SDK not detected on initial load');
  window.addEventListener('load', () => {
    console.log('Window loaded, attempting auth system initialization');
    initAuthSystem();
  });
} else {
  document.addEventListener('DOMContentLoaded', initAuthSystem);
}

// Utility Functions
function clearError() {
  const errorElement = document.getElementById('auth-error');
  if (errorElement) errorElement.textContent = '';
}

function setLoading(button, isLoading) {
  if (!button) return;
  
  const buttonText = button.querySelector('.button-text');
  const spinner = button.querySelector('.loading-spinner');
  
  if (buttonText) buttonText.style.display = isLoading ? 'none' : 'block';
  if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
  button.disabled = isLoading;
}

function showError(message, type = 'error') {
  const errorElement = document.getElementById('auth-error');
  if (!errorElement) return;
  
  errorElement.textContent = message;
  errorElement.style.color = type === 'success' ? 'green' : 'orange';
  errorElement.scrollIntoView({ behavior: 'smooth' });
}

// Main initialization
async function initAuthSystem() {
  try { 
    // Handle logout messages first
    const urlParams = new URLSearchParams(window.location.search);
    const logoutStatus = urlParams.get('logout');
    
    if (logoutStatus === 'success') {
      showError('You have been logged out successfully', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (logoutStatus === 'error') {
      showError('Logout failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!await ensureFirebaseLoaded()) {
      showError("Authentication system is loading...");
      return;
    }

    await initializeFirebase();
    setupEventListeners();
    setupAuthStateListener();
  } catch (error) {
    console.error("Auth system initialization failed:", error);
    showError("System error. Please refresh the page.");
    disableForms();
  }
}

async function ensureFirebaseLoaded() {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    console.log('Firebase SDK already loaded');
    return true;
  }

  console.log('Waiting for Firebase SDK to load...');
  return new Promise((resolve) => {
    const maxWaitTime = 10000;
    let elapsedTime = 0;
    const checkInterval = 100;

    const interval = setInterval(() => {
      elapsedTime += checkInterval;
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        clearInterval(interval);
        console.log('Firebase SDK loaded successfully');
        resolve(true);
      } else if (elapsedTime >= maxWaitTime) {
        clearInterval(interval);
        console.error('Firebase SDK failed to load after', maxWaitTime / 1000, 'seconds');
        resolve(false);
      }
    }, checkInterval);
  });
}

// Initialize Firebase
export async function initializeFirebase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK not properly loaded');
      }

      if (firebase.apps.length > 0 && auth && db) {
        console.debug('Firebase already initialized');
        return { auth, db };
      }

      console.log('Fetching Firebase config...');
      const configResponse = await Promise.race([
        fetch('/.netlify/functions/getConfig'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Config fetch timeout')), 5000)
        )
      ]);

      if (!configResponse.ok) {
        throw new Error(`HTTP error! Status: ${configResponse.status}`);
      }

      const { firebaseConfig } = await configResponse.json();

      if (!firebaseConfig || !firebaseConfig.apiKey) {
        throw new Error('Invalid Firebase configuration');
      }

      const app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      // Initialize services
      auth = firebase.auth(app);
      db = firebase.firestore(app);

      if (!auth || !db) {
        throw new Error('Firebase services failed to initialize');
      }

      // === FIXED: Proper Firestore Persistence Setup ===
      try {
        await db.enablePersistence({
          synchronizeTabs: true  // Recommended for multi-tab support
        });
        console.log('✅ Firestore persistence enabled with indexedDB');
      } catch (persistenceError) {
        if (persistenceError.code === 'failed-precondition') {
          console.warn('Multiple tabs open - persistence enabled in first tab only');
        } else if (persistenceError.code === 'unimplemented') {
          console.warn('Current browser does not support Firestore persistence');
        } else {
          console.warn('Firestore persistence failed:', persistenceError);
        }
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
  if (!isFirebaseReady) {
    throw new Error('Authentication service not ready - please wait');
  }
}

// Auth State Listener
function setupAuthStateListener() {
  if (authStateUnsubscribe) authStateUnsubscribe();
  
  let isHandlingRedirect = false;
  let lastRedirectTime = 0;

  authStateUnsubscribe = auth.onAuthStateChanged(async user => {
    const now = Date.now();
    
    console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
    
    if (isHandlingRedirect || (now - lastRedirectTime < 2000)) {
      return;
    }
    
    isHandlingRedirect = true;
    lastRedirectTime = now;
    
    const currentPath = window.location.pathname.replace(/\/$/, '').split('?')[0].toLowerCase();
    const isDashboard = currentPath.endsWith('/dashboard');
    const isPayment = currentPath.endsWith('/payment');
    const isQuiz = currentPath.endsWith('/quiz');
    
    try {
      if (user) {
        if (isQuiz || isPayment) return; // Allow these pages
        if (!isDashboard) {
          window.location.replace('/dashboard');
        }
      } else {
        if (isDashboard || isQuiz || isPayment) {
          window.location.replace('/index');
        }
      }
    } catch (error) {
      console.error('Redirect error:', error);
    } finally {
      setTimeout(() => {
        isHandlingRedirect = false;
      }, 1000);
    }
  });
}

function disableForms() {
  document.querySelectorAll('#login-btn, #signup-btn').forEach(btn => {
    if (btn) btn.disabled = true;
  });
}

// Form validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Login handler
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

  isLoginProcessing = true;
  setLoading(loginBtn, true);
  clearError();

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isLoginProcessing = false;
    setLoading(loginBtn, false);
  }
}

// Logout function
export async function handleLogout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  window.isLoggingOut = true;
  const logoutBtn = document.getElementById('logout-btn');
  
  try {
    if (logoutBtn) setLoading(logoutBtn, true);

    if (!firebase.apps.length || !auth) {
      await initializeFirebase();
    }

    await auth.signOut();

    // Clear storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase:')) localStorage.removeItem(key);
    });
    sessionStorage.clear();

    const redirectUrl = new URL('/index', window.location.origin);
    redirectUrl.searchParams.set('logout', 'success');
    window.location.replace(redirectUrl.toString());

  } catch (error) {
    console.error('[Logout] Failed:', error);
    
    const redirectUrl = new URL('/index', window.location.origin);
    redirectUrl.searchParams.set('logout', 'error');
    window.location.replace(redirectUrl.toString());
    
  } finally {
    window.isLoggingOut = false;
    if (logoutBtn) setLoading(logoutBtn, false);
  }
}

// Signup handler
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

  if (!emailInput || !passwordInput || !firstNameInput || !lastNameInput || !signupBtn) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (!validateEmail(email)) return showError('Please enter a valid email address');
  if (password.length < 6) return showError('Password must be at least 6 characters');
  if (!firstName || !lastName) return showError('Please enter your full name');

  isSignupProcessing = true;
  setLoading(signupBtn, true);
  clearError();

  try {
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

    // Clear fields
    emailInput.value = passwordInput.value = firstNameInput.value = lastNameInput.value = '';

  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isSignupProcessing = false;
    setLoading(signupBtn, false);
  }
}

function getFriendlyError(error) {
  const code = error.code || error;
  
  switch(code) {
    case 'auth/invalid-email': 
    case 'auth/invalid-email-address':
      return 'Invalid email address';
    case 'auth/user-disabled': 
      return 'Account disabled by administrator';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password';
    case 'auth/email-already-in-use': 
      return 'Email already registered';
    case 'auth/weak-password': 
      return 'Password must be at least 6 characters';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    default:
      console.warn('Unhandled auth error:', code);
      return 'An error occurred. Please sign up or try again.';
  }
}

function setupEventListeners() {
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  showSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'flex';
    clearError();
  });

  showLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'flex';
    clearError();
  });
 
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);

    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');

    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        input.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
  });
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (authStateUnsubscribe) authStateUnsubscribe();
});