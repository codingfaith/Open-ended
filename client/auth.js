// Firebase instances
let auth, db;
let authStateUnsubscribe = null; // To store the auth state listener

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

function showError(message) {
  const errorElement = document.getElementById('auth-error');
  if (errorElement) errorElement.textContent = message;
}

// Main initialization
async function initAuthSystem() {
  try {
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
async function initializeFirebase() {
  try {
    const response = await fetch('/.netlify/functions/getConfig');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    console.log("Response from getConfig:", data);
    
    if (!data.firebaseConfig) {
      throw new Error('Invalid Firebase configuration');
    }

    const app = firebase.apps.length 
      ? firebase.app() 
      : firebase.initializeApp(data.firebaseConfig);
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Verify services initialized
    if (!auth || !db) throw new Error('Firebase services not initialized');
    
    console.log("Firebase initialized successfully", data.firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase init error:", error);
    throw error;
  }
}

function setupAuthStateListener() {
  // Clean up previous listener if exists
  if (authStateUnsubscribe) authStateUnsubscribe();
  
  authStateUnsubscribe = auth.onAuthStateChanged(user => {
    if (user && !window.location.pathname.includes('/dashboard.html')) {
      console.log('Redirecting authenticated user');
      window.location.href = '/dashboard.html';
    }
  });
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

  if (!emailInput || !passwordInput || !firstNameInput || !lastNameInput || !signupBtn) return;

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
    
    // Send email verification (recommended)
    await userCredential.user.sendEmailVerification();
  } catch (error) {
    showError(getFriendlyError(error));
  } finally {
    isSignupProcessing = false;
    setLoading(signupBtn, false);
  }
}

// Logout handler
async function handleLogout(e) {
  if (e) e.preventDefault();
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) setLoading(logoutBtn, true);

  try {
    // Verify auth is initialized
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    console.log('Attempting to sign out user...');
    await auth.signOut();

    // Clear any client-side storage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('User signed out successfully');
    // Redirect to login page after logout
    window.location.href = '/index.html'; // Update with your login page path
    
  } catch (error) {
    console.error('Logout failed:', error);
    showError(getFriendlyError(error));
    
    // If logout failed but we want to force redirect
    window.location.href = '/index.html';
    
  } finally {
    if (logoutBtn) setLoading(logoutBtn, false);
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

  // Login/Signup button handlers 
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
   document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (authStateUnsubscribe) authStateUnsubscribe();
});

// Start the system when DOM is ready
document.addEventListener('DOMContentLoaded', initAuthSystem);