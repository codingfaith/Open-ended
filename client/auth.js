// auth.js
async function initSupabase() {
  const response = await fetch('/.netlify/functions/getConfig');
  const { supabaseUrl, supabaseKey } = await response.json();
  return window.supabase.createClient(supabaseUrl, supabaseKey);
}

// Password strength validation function
function isStrongPassword(password) {
  const minLength = 8;
  const hasNumber = /\d/;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;
  const hasUpperCase = /[A-Z]/;
  
  return (
    password.length >= minLength &&
    hasNumber.test(password) &&
    hasSpecialChar.test(password) &&
    hasUpperCase.test(password)
  );
}

// Check if email exists
async function isEmailAvailable(supabase, email) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
    console.error('Email check error:', error);
    return false;
  }
  return !data; // Available if no record found
}

// DOM elements
const logIn = document.getElementById('login-form');
const signUp = document.getElementById('signup-form');

// Toggle between forms
document.getElementById('show-signup').addEventListener('click', () => {
  signUp.style.display = 'flex';
  logIn.style.display = 'none';
});

document.getElementById('show-login').addEventListener('click', () => {
  signUp.style.display = 'none';
  logIn.style.display = 'flex';
});

// Main execution
document.addEventListener('DOMContentLoaded', async () => {
  const supabase = await initSupabase();

  // Signup handler
  document.getElementById('signup-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const button = e.currentTarget;
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');
    
    const userData = {
      email: document.getElementById('signup-email').value.trim(),
      password: document.getElementById('signup-password').value,
      firstName: document.getElementById('signup-firstname').value.trim(),
      lastName: document.getElementById('signup-lastname').value.trim()
    };

    try {
      // Validate inputs
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        throw new Error('All fields are required');
      }

      if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!isStrongPassword(userData.password)) {
        throw new Error('Password must contain:\n- 8+ characters\n- 1 number\n- 1 special character\n- 1 uppercase letter');
      }

      // Check email availability
      if (!await isEmailAvailable(supabase, userData.email)) {
        throw new Error('Email already registered');
      }

      // Show loading state
      button.disabled = true;
      buttonText.style.display = 'none';
      spinner.style.display = 'inline-flex';

      const response = await fetch('/.netlify/functions/auth-signup', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Signup successful! Check your email for confirmation.');
        signUp.style.display = 'none';
        logIn.style.display = 'flex';
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert(error.message);
    } finally {
      button.disabled = false;
      buttonText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  });

  // Login handler
  document.getElementById('login-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const button = e.currentTarget;
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');

    const credentials = {
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value
    };

    try {
      // Basic validation
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Show loading state
      button.disabled = true;
      buttonText.style.display = 'none';
      spinner.style.display = 'inline-flex';
    
      const response = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok) {
        window.location.href = '/dashboard';
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(error.message);
    } finally {
      button.disabled = false;
      buttonText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  });
});