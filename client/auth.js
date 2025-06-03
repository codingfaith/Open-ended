// Firebase instances
let auth, db;

// Main initialization function
async function initAuthSystem() {
  try {
    await initializeFirebase();
    setupEventListeners();
    checkAuthState();
  } catch (error) {
    console.error("Auth system initialization failed:", error);
    showError("System error. Please refresh the page.");
    disableForms();
  }
}

async function initializeFirebase() {
  try {
    const response = await fetch('/.netlify/functions/getConfig');
    if (!response.ok) throw new Error('Failed to fetch config');
    
    const { firebaseConfig } = await response.json();
    
    // Initialize only if not already initialized
    const app = firebase.apps.length 
      ? firebase.app() 
      : firebase.initializeApp(firebaseConfig);
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase init error:", error);
    throw error; // Rethrow for parent handler
  }
}

function disableForms() {
  document.querySelectorAll('#login-btn, #signup-btn').forEach(btn => {
    btn.disabled = true;
  });
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
    if (!db) throw new Error("Database not initialized");
    
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

// Modified checkAuthState to prevent redirect loop
function checkAuthState() {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log('User is logged in:', user.email);
      // Only redirect if not already on dashboard
      if (!window.location.pathname.includes('/dashboard.html')) {
        window.location.href = '/dashboard.html';
      }
    }
  });
}

// Start the system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initAuthSystem();
});