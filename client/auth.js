// Firebase instances
let db = null;
let auth = null;
let isFirebaseReady = false;
let authStateUnsubscribe = null; // To store the auth state listener
let initializationPromise = null; // To prevent duplicate initializations

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

// Update showError to handle success/error states
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
    // 1. Handle logout messages first (no Firebase needed)
    const urlParams = new URLSearchParams(window.location.search);
    const logoutStatus = urlParams.get('logout');
    
    if (logoutStatus === 'success') {
      showError('You have been logged out successfully', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (logoutStatus === 'error') {
      showError('Logout failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Ensure Firebase is loaded before proceeding
    if (!await ensureFirebaseLoaded()) {
      showError("Authentication system is loading...");
      return;
    }

    // 3. Now safe to initialize Firebase
    await initializeFirebase();
    setupEventListeners();
    setupAuthStateListener();
  } catch (error) {
    console.error("Auth system initialization failed:", error);
    showError("System error. Please refresh the page.");
    disableForms();
  }
}

// New helper function
async function ensureFirebaseLoaded() {
  // Check if already loaded
  if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    return true;
  }

  // If not loaded, wait for it
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error("Firebase SDK failed to load");
      resolve(false);
    }, 5000);
  });
}

//initialize firebase
// export async function initializeFirebase() {
//   try {
//     // 1. Check if already initialized
//     if (firebase.apps.length && auth && db) {
//       console.log('Firebase already initialized');
//       return { auth, db }; // Return existing instances
//     }

//     // 2. Fetch configuration
//     const response = await fetch('/.netlify/functions/getConfig');
//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log("Firebase config received:", data);
    
//     if (!data.firebaseConfig) {
//       throw new Error('Missing firebaseConfig in response');
//     }

//     // 3. Initialize or get existing app
//     const app = firebase.apps.length 
//       ? firebase.app() 
//       : firebase.initializeApp(data.firebaseConfig);
    
//     // 4. Initialize services
//     auth = firebase.auth();
//     db = firebase.firestore();
    
//     // 5. Verify services
//     if (!auth || !db) {
//       throw new Error('Firebase services failed to initialize');
//     }
//     isFirebaseReady = true;
//     console.log('Firebase initialized successfully');
//     return { auth, db };
    
//   } catch (error) {
//     console.error('Firebase initialization failed:', error);
//     throw error; // Rethrow for caller to handle
//   }
// }

export async function initializeFirebase() {
  // Return existing promise if initialization is already in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // 1. Verify Firebase SDK is actually loaded
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK not properly loaded');
      }

      // 2. Check for existing initialized services
      if (firebase.apps.length > 0 && auth && db) {
        console.debug('Firebase already initialized');
        return { auth, db };
      }

      // 3. Fetch configuration with timeout
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
      
      // 4. Validate configuration
      if (!firebaseConfig || !firebaseConfig.apiKey) {
        throw new Error('Invalid Firebase configuration');
      }

      // 5. Initialize or get app instance
      const app = firebase.apps.length 
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      // 6. Initialize services with error protection
      auth = firebase.auth?.(app) || null;
      db = firebase.firestore?.(app) || null;

      if (!auth || !db) {
        throw new Error('Firebase services failed to initialize');
      }

      // 7. Configure Firestore persistence
      try {
        await db.enablePersistence({ synchronizeTabs: true });
        console.debug('Firestore persistence enabled');
      } catch (persistenceError) {
        console.warn('Firestore persistence failed:', persistenceError);
      }

      isFirebaseReady = true;
      console.log('Firebase initialized successfully');
      return { auth, db };

    } catch (error) {
      // Reset state on failure
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

// Update the auth state listener with redirect protection
function setupAuthStateListener() {
  if (authStateUnsubscribe) authStateUnsubscribe();
  
  let isHandlingRedirect = false;
  let isLoggingOut = false;
  let lastRedirectTime = 0;
  let authChecked = false;
  
  authStateUnsubscribe = auth.onAuthStateChanged(async user => {
    authChecked = true;
    const now = Date.now();
    
    // Debug logs
    console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
    console.log('Current path:', window.location.pathname);
    
    // Prevent multiple redirects
    if (isHandlingRedirect || isLoggingOut || (now - lastRedirectTime < 2000)) {
      console.log('Redirect skipped (already handling or too recent)');
      return;
    }
    
    isHandlingRedirect = true;
    lastRedirectTime = now;
    
    // Normalize path (remove trailing slashes and query params)
    const currentPath = window.location.pathname.replace(/\/$/, '').split('?')[0].toLowerCase();
    const isDashboard = currentPath.endsWith('/dashboard');
    
    console.log('Processed path:', { currentPath, isDashboard });
    
    try {
      if (user) {
        if (!isDashboard) {
          console.log('Redirecting to dashboard...');
          // Use replaceState to avoid adding to browser history
          window.history.replaceState(null, '', '/dashboard');
          // Force reload only if necessary
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
          }
        }
      } else {
        if (isDashboard) {
          console.log('Redirecting to login...');
          window.history.replaceState(null, '', '/index');
          if (window.location.pathname !== '/index') {
            window.location.href = '/index';
          }
        }
      }
    } catch (error) {
      console.error('Redirect error:', error);
    } finally {
      setTimeout(() => {
        isHandlingRedirect = false;
        console.log('Redirect lock released');
      }, 1000);
    }
  });

  // Add timeout for auth check
  setTimeout(() => {
    if (!authChecked) {
      console.warn('Auth state check is taking too long...');
    }
  }, 3000);
}

function disableForms() {
  const buttons = document.querySelectorAll('#login-btn, #signup-btn');
  if (buttons) {
    buttons.forEach(btn => btn.disabled = true);
  }
}

// Form validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Login handler with debouncing
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
    // Redirect handled by auth state listener
  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isLoginProcessing = false;
    setLoading(loginBtn, false);
  }
}

//logout function
async function handleLogout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // UI state management
  window.isLoggingOut = true;
  const logoutBtn = document.getElementById('logout-btn');
  try {
    if (logoutBtn) setLoading(logoutBtn, true);
    console.log('[Logout] Starting logout process...');

    // Ensure Firebase is ready
    if (!firebase.apps.length || !auth) {
      console.warn('[Logout] Firebase not ready - initializing');
      await initializeFirebase();
    }

    // Safety check
    if (!auth) {
      throw new Error('Auth unavailable after initialization');
    }

    // Check current user state
    console.log('[Logout] Current user before signout:', auth.currentUser);
    
    // Sign out from Firebase
    console.log('[Logout] Attempting signOut...');
    await auth.signOut();
    
    // Verify signout worked
    console.log('[Logout] Current user after signout:', auth.currentUser);
    
    // Clear client-side authentication data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase:')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
    console.log('[Logout] Authentication data cleared');

    // Redirect with cache-buster and using replace to prevent back button issues
    const redirectUrl = new URL('/index', window.location.origin);
    redirectUrl.searchParams.set('logout', 'success');
    redirectUrl.searchParams.set('t', Date.now()); // cache-buster
    console.log('[Logout] Redirecting to:', redirectUrl.toString());
    window.location.replace(redirectUrl.toString());

  } catch (error) {
    console.error('[Logout] Logout failed:', error);
    console.group('[Logout] Full Error Details');
    console.error('Error object:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Auth state:', auth?.currentUser);
    console.error('Firebase apps:', firebase.apps);
    console.groupEnd();
    
    // Detailed error redirect
    const redirectUrl = new URL('/index', window.location.origin);
    const params = new URLSearchParams({
      logout: 'error',
      code: error.code || 'internal',
      from: 'handleLogout'
    });
    redirectUrl.search = params.toString();
    window.location.replace(redirectUrl.toString());
    
  } finally {
    // Cleanup
    window.isLoggingOut = false;
    if (logoutBtn) setLoading(logoutBtn, false);
    console.log('[Logout] Process completed');
  }
}

// Signup handler with enhanced validation
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

  if (!emailInput || !passwordInput || !firstNameInput || !lastNameInput || !signupBtn || !loginForm || !signupForm) return;

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

  isSignupProcessing = true;
  setLoading(signupBtn, true);
  clearError();

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    if (!db) throw new Error("Database not initialized");
    
    await db.collection('users').doc(userCredential.user.uid).set({
      firstName,
      lastName,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Send email verification
    await userCredential.user.sendEmailVerification();

    // Show success message and switch to login form
    showError('Signup successful! Please check your email for verification.', 'success');
    signupForm.style.display = 'none';
    loginForm.style.display = 'flex';

    // Clear form fields
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

function getFriendlyError(error) {
  // Handle case where full error object is passed
  const code = error.code || error;
  
  switch(code) {
    // Authentication Errors
    case 'auth/invalid-email': 
    case 'auth/invalid-email-address': // Some versions use this
      return 'Invalid email address';
      
    case 'auth/user-disabled': 
      return 'Account disabled by administrator';
      
    case 'auth/user-not-found':
    case 'auth/wrong-password': // Note: Firebase returns this instead of "user-not-found" for security
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
      
    // Network/System Errors  
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
      
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later or reset password';
      
    // Timeout Errors  
    case 'auth/timeout':
      return 'Request timed out. Try again';
      
    // Default catch-all
    default:
      console.warn('Unhandled auth error:', code); // Log unknown errors
      return typeof error === 'string' ? error : 'Login failed. Please try again';
  }
}

function setupEventListeners() {
  // Get elements safely
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  // Verify all elements exist
  if (!showSignup || !showLogin || !loginForm || !signupForm) {
    console.error('Form elements missing!');
    return;
  }
 
  // Toggle to Signup Form
  showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'flex';
    clearError();
  });

  // Toggle to Login Form
  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'flex';
    clearError();
  });

  // Login/Signup/Logout button handlers 
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (authStateUnsubscribe) authStateUnsubscribe();
});

// Start the system when DOM is ready
document.addEventListener('DOMContentLoaded', ()=>  {
  initAuthSystem();

  // Safety fallback for logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      try {
        checkAuthReady();
        await handleLogout(e);
      } catch (error) {
        console.error('Logout preparation failed:', error);
        showError('System not ready - try again in a moment');
      }
    });
  }
});