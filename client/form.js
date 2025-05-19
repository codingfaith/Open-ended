import { createClient } from "@supabase/supabase-js";
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authContainer = document.getElementById('auth-container');

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
});

// Sign up function
signupBtn.addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const firstName = document.getElementById('signup-firstname').value;
  const lastName = document.getElementById('signup-lastname').value;
  
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Save additional user data to your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        { 
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName
        }
      ]);
    
    if (userError) throw userError;
    
    alert('Signup successful! Please check your email for confirmation.');
    showLogin.click();
  } catch (error) {
    alert(error.message);
  }
});

// Login function
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // On successful login
    authContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    loadQuizForUser(data.user.id);
  } catch (error) {
    alert(error.message);
  }
});

// Check if user is already logged in
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    authContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    loadQuizForUser(user.id);
  }
}

// Call this on page load
checkAuth();

// Logout function (add a logout button to your quiz container)
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
}