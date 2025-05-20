document.getElementById('contact-details').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById('form-message');
  
  // Disable button to prevent multiple submissions
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';
  messageDiv.textContent = '';
  messageDiv.style.color = '';

  if (!form.checkValidity()) {
    // Handle invalid form
    return;
  }
  
  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    });
    
    if (response.ok) {
      messageDiv.textContent = 'Thank you! Your message has been sent.';
      messageDiv.style.color = 'green';
      form.reset();
    } else {
      throw new Error('Network response was not ok');
    }
  } catch (error) {
    messageDiv.textContent = 'Oops! There was a problem sending your message. Please try again.';
    messageDiv.style.color = 'red';
    console.error('Error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
});