// auth.js
async function initSupabase() {
  const response = await fetch('/.netlify/functions/getConfig');
  const { supabaseUrl, supabaseKey } = await response.json();
  
  return window.supabase.createClient(supabaseUrl, supabaseKey);
}

//grab elements
const logIn = document.getElementById('login-form')
const signUp = document.getElementById('signup-form')

//toggle between sign-up and login forms
document.getElementById('show-signup').addEventListener('click', () => {
  signUp.style.display = 'flex';
  logIn.style.display = 'none';
})
document.getElementById('show-login').addEventListener('click', () => {
  signUp.style.display = 'none';
  logIn.style.display = 'flex';
})

// supabase Usage
document.addEventListener('DOMContentLoaded', async () => {
  const supabase = await initSupabase();

  // Signup handler
  document.getElementById('signup-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const button = e.currentTarget;
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');
    
    const userData = {
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
      firstName: document.getElementById('signup-firstname').value,
      lastName: document.getElementById('signup-lastname').value
    };

    try {
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
        // Switch to login form
        signUp.style.display = 'none';
        logIn.style.display = 'flex';
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert(error.message);
    }
  });

  // Login handler
  document.getElementById('login-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const button = e.currentTarget;
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');

    const credentials = {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    };

    try {
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
        // Redirect or update UI
        window.location.href = '/dashboard.html';
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(error.message);
    }
  });
});