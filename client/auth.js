// Firebase instances
let auth, db;
let authStateUnsubscribe = null; // To store the auth state listener
let isFirebaseReady = false;

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
    // Check for logout messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const logoutStatus = urlParams.get('logout');
    
    if (logoutStatus === 'success') {
      showError('You have been logged out successfully', 'success');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (logoutStatus === 'error') {
      showError('Logout failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }


    // Verify Firebase is loaded
    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
      throw new Error('Firebase SDK not loaded');
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

//initialize firebase
export async function initializeFirebase() {
  try {
    // 1. Check if already initialized
    if (firebase.apps.length && auth && db) {
      console.log('Firebase already initialized');
      return { auth, db }; // Return existing instances
    }

    // 2. Fetch configuration
    const response = await fetch('/.netlify/functions/getConfig');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Firebase config received:", data);
    
    if (!data.firebaseConfig) {
      throw new Error('Missing firebaseConfig in response');
    }

    // 3. Initialize or get existing app
    const app = firebase.apps.length 
      ? firebase.app() 
      : firebase.initializeApp(data.firebaseConfig);
    
    // 4. Initialize services
    auth = firebase.auth();
    db = firebase.firestore();
    
    // 5. Verify services
    if (!auth || !db) {
      throw new Error('Firebase services failed to initialize');
    }
    isFirebaseReady = true;
    console.log('Firebase initialized successfully');
    return { auth, db };
    
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error; // Rethrow for caller to handle
  }
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
      // Optional: show user feedback or fallback behavior
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

  try {
    // Ensure Firebase is ready
    if (!firebase.apps.length || !auth) {
      console.warn('Firebase not ready - initializing');
      await initializeFirebase();
    }

    // Safety check
    if (!auth) {
      throw new Error('Auth unavailable after initialization');
    }

    console.log('Proceeding with logout...');
    await auth.signOut();
    
    // Clear only auth-related items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase:')) {
        localStorage.removeItem(key);
      }
    });

    // Redirect with cache-buster
    window.location.assign(`/index?logout=success&t=${Date.now()}`);
    
  } catch (error) {
    console.error('Logout failed:', error);
    console.group('[Logout] Full Error Details');
    console.error('Error object:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Auth state:', auth?.currentUser);
    console.error('Firebase apps:', firebase.apps);
    console.groupEnd();
    
    // Detailed error redirect
    const params = new URLSearchParams({
      logout: 'error',
      code: error.code || 'internal',
      from: 'handleLogout'
    });
    
    window.location.assign(`/index?${params.toString()}`);
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

// Logout handler
// async function handleLogout(e) {
//   if (e) {
//     e.preventDefault();
//     e.stopPropagation();
//   }
//   window.isLoggingOut = true;

//   console.log('[Logout] Starting logout process...');
//   const logoutBtn = document.getElementById('logout-btn');
  
//   try {
//     if (logoutBtn) setLoading(logoutBtn, true);

//     // Verify auth is initialized
//     if (!auth) {
//       console.error('[Logout] Auth service not initialized');
//       throw new Error('Authentication service not available');
//     }

//     // Check current user state
//     console.log('[Logout] Current user before signout:', auth.currentUser);
    
//     // Sign out from Firebase
//     console.log('[Logout] Attempting signOut...');
//     await auth.signOut();
    
//     // Verify signout worked
//     console.log('[Logout] Current user after signout:', auth.currentUser);
    
//     // Clear client-side data
//     localStorage.clear();
//     sessionStorage.clear();
//     console.log('[Logout] Local storage cleared');

//     // Use replaceState to avoid back button issues
//     const redirectUrl = new URL('/index', window.location.origin);
//     redirectUrl.searchParams.set('logout', 'success');
//     console.log('[Logout] Redirecting to:', redirectUrl.toString());
//     window.location.replace(redirectUrl.toString());

//   } catch (error) {
//     console.error('[Logout] Full error:', error);
    
//     const redirectUrl = new URL('/index', window.location.origin);
//     redirectUrl.searchParams.set('logout', 'error');
//     window.location.replace(redirectUrl.toString());
    
//   } finally {
//     if (logoutBtn) setLoading(logoutBtn, false);
//   }
// }

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