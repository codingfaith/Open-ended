// Firebase references (will be initialized after config fetch)
let auth, db;

// Initialize Firebase asynchronously
async function initializeFirebase() {
  try {
    // Fetch config from Netlify function
    const response = await fetch('/.netlify/functions/getConfig');
    if (!response.ok) throw new Error('Failed to fetch Firebase config');
    
    const { firebaseConfig } = await response.json();
    const app = firebase.initializeApp(firebaseConfig);
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log('Firebase initialized successfully');
    return { auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    showError('Failed to initialize application. Please refresh the page.');
    throw error;
  }
}

// Main initialization function
async function initAuthSystem() {
  try {
    await initializeFirebase();
    setupEventListeners();
    checkAuthState();
  } catch (error) {
    // Critical failure - disable forms
    document.querySelectorAll('#login-btn, #signup-btn').forEach(btn => {
      btn.disabled = true;
    });
  }
}

// Setup all event listeners after Firebase is ready
function setupEventListeners() {
  // Toggle Forms
  document.getElementById('show-signup').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'flex';
    clearError();
  });

  document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'flex';
    clearError();
  });

  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);

  // Signup
  document.getElementById('signup-btn').addEventListener('click', handleSignup);
}

// Login handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const loginBtn = document.getElementById('login-btn');

  setLoading(loginBtn, true);
  clearError();

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = '/dashboard.html';
  } catch (error) {
    showError(getFriendlyError(error.code));
  } finally {
    setLoading(loginBtn, false);
  }
}

// Signup handler
async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const firstName = document.getElementById('signup-firstname').value;
  const lastName = document.getElementById('signup-lastname').value;
  const signupBtn = document.getElementById('signup-btn');

  setLoading(signupBtn, true);
  clearError();

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    await db.collection('users').doc(userCredential.user.uid).set({
      firstName,
      lastName,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    window.location.href = '/dashboard.html';
  } catch (error) {
    showError(getFriendlyError(error.code));
  } finally {
    setLoading(signupBtn, false);
  }
}

// Auth state listener
function checkAuthState() {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log('User is logged in:', user.email);
      window.location.href = '/dashboard.html';
    }
  });
}

// Utility functions (unchanged)
function setLoading(button, isLoading) {
  const buttonText = button.querySelector('.button-text');
  const spinner = button.querySelector('.loading-spinner');
  
  button.disabled = isLoading;
  buttonText.style.display = isLoading ? 'none' : 'block';
  spinner.style.display = isLoading ? 'block' : 'none';
}

function showError(message) {
  document.getElementById('auth-error').textContent = message;
}

function clearError() {
  document.getElementById('auth-error').textContent = '';
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

// Start the authentication system
initAuthSystem();