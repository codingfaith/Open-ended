// Signup handler
document.getElementById('signup-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const userData = {
    email: document.getElementById('signup-email').value,
    password: document.getElementById('signup-password').value,
    firstName: document.getElementById('signup-firstname').value,
    lastName: document.getElementById('signup-lastname').value
  };

  try {
    const response = await fetch('/.netlify/functions/auth-signup', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    
    if (response.ok) {
      alert('Signup successful! Check your email for confirmation.');
      // Switch to login form
      document.getElementById('signup-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
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
  
  const credentials = {
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  };

  try {
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