import { initializeFirebase } from './auth.js';

// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');
const resultsBtnTxt = document.getElementById('results-btnTxt') || document.createElement('span');
const adminView = document.getElementById('admin-results-container');
let usersNum = 0;
let message =  document.getElementById('message');
// iOS-specific event listener with passive option
const addIOSSafeListener = (element, event, handler) => {
  if (!element) return;
  element.addEventListener(event, handler, { passive: true });
};

// Toggle dashboard visibility with iOS-safe classList
addIOSSafeListener(previousBtn, "click", () => {
  if (!dashboardResult || !dashboardImg || !resultsBtnTxt) return;
  
  if (dashboardResult.classList.contains("hide")) {
    dashboardResult.classList.remove("hide");
    dashboardResult.classList.add("show");
    resultsBtnTxt.textContent = "←Go back";
  } else {
    dashboardResult.classList.remove("show");
    dashboardResult.classList.add("hide");
    resultsBtnTxt.textContent = "See previous results";
  }

  if (dashboardImg.classList.contains("hide")) {
    dashboardImg.classList.remove("hide");
    dashboardImg.classList.add("show");
  } else {
    dashboardImg.classList.remove("show");
    dashboardImg.classList.add("hide");
  } 
});

// Main execution wrapper with iOS timers
async function initDashboard() {
  try {
    showLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { auth, db } = await initializeFirebase();

    const user = await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      showError('Please log in to view your results');
      return;
    }

    const isAdmin = await checkAdmin();
    if (isAdmin) {
      message.style.display = "block";
      document.getElementById('dashboard-assess').innerHTML =` 
        <h3 id="admin-greeting"></h3>
        <div id="admin-previous-results"></div>`;
      loadRecentUsers(db);
    } else {
      adminView.style.display = "none";
      const data = await getUserAttemptsWithProfile(user.uid, db);
      console.log('User data loaded');
      requestAnimationFrame(() => displayData(data));
    }

  } catch (error) {
    console.error('Dashboard failed:', error);
    showError(iOSErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

// Check if current user is admin
async function checkAdmin() {
  const { auth, db } = await initializeFirebase();
  const user = auth.currentUser;
  if (!user) return false;

  const userDoc = await db.collection("users").doc(user.uid).get();
  return userDoc.data()?.role === "admin"; // Returns true/false
}


function displayUserResults(userDocs, db) {
  if (!adminView) return;
  message.innerHTML = `<h3>${usersNum} users have taken the test!</h3>`;
  
  // Clear existing content safely
  while (adminView.firstChild) {
    adminView.removeChild(adminView.firstChild);
  }

  if (userDocs.length === 0) {
    adminView.innerHTML = '<p>No users found</p>';
    return;
  }

  userDocs.forEach(doc => {
    const user = doc.data();
    const userCard = document.createElement('div');
    userCard.className = 'admin-user-card';
    userCard.setAttribute('data-uid', doc.id);
    userCard.innerHTML = `
      <h3>${user.firstName || ''} ${user.lastName || ''}</h3>
      <p>Email: ${user.email || 'No email'}</p>
      <p>Last login: ${user.lastLogin?.toDate().toLocaleString() || 'Unknown'}</p>
      <button class="view-user-btn" aria-label="View results for ${user.firstName || 'user'}">View Results</button><hr>`;
    
    const viewBtn = userCard.querySelector('.view-user-btn');
    if (viewBtn) {
      addIOSSafeListener(viewBtn, 'click', async function() {
        try {
          showLoading(true);
          const data = await getUserAttemptsWithProfile(doc.id, db);
          displayAdminData(data);
        } catch (error) {
          console.error("Error loading user data:", error);
          showError("Failed to load user data");
        } finally {
          showLoading(false);
        }
      });
    }
    adminView.appendChild(userCard);
  });
}

async function loadRecentUsers(db) {
  try {
    showLoading(true);
    
    // First get all recent users
    const usersSnapshot = await db.collection("users")
      .orderBy("lastLogin", "desc")
      .limit(100) // Add reasonable limit
      .get();

    // Check each user for attempts
    const usersWithAttempts = await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const attemptsSnapshot = await db.collection("userResults")
          .doc(userDoc.id)
          .collection("attempts")
          .limit(1) // We only need to know if at least one exists
          .get();
        
        return {
          userDoc,
          hasAttempts: !attemptsSnapshot.empty
        };
      })
    );

    // Filter to only users with attempts
    const filteredUsers = usersWithAttempts
      .filter(user => user.hasAttempts)
      .map(user => user.userDoc);

    console.log(`Found ${filteredUsers.length} users with attempts`);
    usersNum = filteredUsers.length;
    displayUserResults(filteredUsers, db);
    
  } catch (error) {
    console.error("Error loading recent users:", error);
    showError("Failed to load users with results");
  } finally {
    showLoading(false);
  }
}

// Add this helper function for better error messages
function getFriendlyErrorMessage(error) {
  if (error.message.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  if (error.message.includes('permission')) {
    return 'You don\'t have permission to view this content.';
  }
  return 'An unexpected error occurred. Please try again.';
}

// Update your error handling to use this:
function showError(message) {
  if (!dashboardErrorMessage) return;
  
  dashboardErrorMessage.textContent = getFriendlyErrorMessage(
    typeof message === 'string' ? { message } : message
  );
  dashboardErrorMessage.style.display = 'block';
  
  setTimeout(() => {
    dashboardErrorMessage.style.display = 'none';
  }, 5000);
}

//for regular users
function displayData(data) {
  // Validate input and required elements
  const greeting = document.getElementById('greeting');
  
  if (!dashboardResult || !greeting) {
    console.error('Missing required elements for user view');
    return;
  }

  // Update greeting
  greeting.textContent = `Welcome back ${data.userProfile?.firstName || 'User'}!`;

  // Clear previous content
  dashboardResult.innerHTML = '';

  // Create new content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'user-results-content';

  // Handle case with no attempts
  if (!data.attempts?.length) {
    contentDiv.innerHTML = `
      <div class="no-attempts">
        <p>You have no results to show yet.</p>
        <p>Complete your first quiz to see your results here! 😊</p>
      </div>
    `;
    dashboardResult.appendChild(contentDiv);
    return;
  }

  // Build attempts list
  contentDiv.innerHTML = `
    <h3>Your Test Attempts</h3>
    <div class="attempts-list">
      ${data.attempts.map((attempt, index) => `
        <div class="attempt-card">
          <span class="attempt-date">${formatAttemptDate(attempt.timestamp)}</span>
          <span class="attempt-score">Score: ${attempt.score}%</span>
          <span class="attempt-class">${attempt.classification}</span>
          <button class="report-toggle-btn" data-index="${index}">
            See report
          </button>
          <div class="report-content hide" id="report-${index}">
            ${formatText(attempt.report)}
            <hr>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add to DOM
  dashboardResult.appendChild(contentDiv);

  // Add event listeners for report toggles
  contentDiv.querySelectorAll('.report-toggle-btn').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const reportDiv = document.getElementById(`report-${index}`);
      
      if (reportDiv) {
        reportDiv.classList.toggle('hide');
        this.textContent = reportDiv.classList.contains('hide') 
          ? 'See report' 
          : 'Hide report';
      }
    });
  });
}

//for admins
function displayAdminData(adminData) {
  // Validate input and required elements
  const adminDashboard = document.getElementById("admin-previous-results");
  const adminGreeting = document.getElementById('admin-greeting');
  
  if (!adminGreeting || !adminView) {
    console.error('Missing required elements for admin view');
    return;
  }

  // Clear previous content
  adminDashboard.innerHTML = '';
  
  // Update admin greeting
  adminGreeting.textContent = `Viewing results for ${adminData.userProfile?.firstName || 'User'} ${adminData.userProfile?.lastName || ''}`;


  // Create new content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'admin-results-content';

  // Handle case with no attempts
  if (!adminData.attempts?.length) {
    contentDiv.innerHTML = `
      <div class="no-attempts">
        <p>No attempts found for this user.</p>
      </div>
    `;
    adminDashboard.appendChild(contentDiv);
    return;
  }

  // Build admin attempts list with additional admin features
  contentDiv.innerHTML = `
    <div class="admin-results-header">
      <h4 style="margin:0">User Attempt</h4>
    </div>
    <div class="attempts-list">
      ${adminData.attempts.map((attempt, index) => `
        <div class="admin-attempt-card">
          <div class="attempt-meta">
            <span class="attempt-date"> Date and time: ${formatAttemptDate(attempt.timestamp)}</span>
          </div>
          <div class="attempt-stats">
            <span class="attempt-score">Score: ${attempt.score}%</span><br>
            <span class="attempt-class">${attempt.classification}</span><br>
             <button class="admin-answers-toggle" data-index="${index}">
              Toggle Answers
            </button><br>
            <button class="admin-report-toggle" data-index="${index}">
              Toggle Full Report
            </button>
          </div><hr>

          <div class="admin-report-content" id="admin-report-${index}">
            ${formatText(attempt.report)}<hr>
          </div>
           <div class="admin-answers-content" id="admin-answers-${index}">
            ${(attempt.answers[0])}<hr>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add to DOM
  adminDashboard.appendChild(contentDiv);
  adminView.classList.remove('hide');

  // Add event listeners
  contentDiv.querySelectorAll('.admin-answers-toggle').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const reportDiv = document.getElementById(`admin-answers-${index}`);
      
      if (reportDiv) {
        reportDiv.classList.toggle('hide');
        this.textContent = reportDiv.classList.contains('hide') 
          ? 'Show Answers' 
          : 'Hide Answers';
      }
    });
  });

  contentDiv.querySelectorAll('.admin-report-toggle').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const reportDiv = document.getElementById(`admin-report-${index}`);
      
      if (reportDiv) {
        reportDiv.classList.toggle('hide');
        this.textContent = reportDiv.classList.contains('hide') 
          ? 'Show Full Report' 
          : 'Hide Full Report';
      }
    });
  });

  // Add admin-specific action listeners
  contentDiv.querySelectorAll('.delete-attempt-btn').forEach(button => {
    button.addEventListener('click', async function() {
      const attemptId = this.getAttribute('data-attempt-id');
      if (confirm('Are you sure you want to delete this attempt?')) {
        await deleteUserAttempt(adminData.userProfile.uid, attemptId);
      }
    });
  });
}

// Helper function for date formatting
function formatAttemptDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'Unknown date';
  return new Date(timestamp.seconds * 1000).toLocaleString();
}

// Modified getUserAttemptsWithProfile to work with any user ID
async function getUserAttemptsWithProfile(userId, db) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const [userDoc, attemptsSnapshot] = await Promise.all([
      db.collection("users").doc(userId).get({ signal: controller.signal }),
      db.collection("userResults").doc(userId)
        .collection("attempts")
        .orderBy("timestamp", "desc")
        .get({ signal: controller.signal })
    ]);

    clearTimeout(timeout);

    if (!userDoc.exists) throw new Error("User profile not found");

    return {
      userProfile: userDoc.data(),
      attempts: attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp?.toDate().toLocaleString()
      }))
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// iOS-specific error messaging
function iOSErrorMessage(error) {
  if (error.message.includes('Firebase')) {
    return 'Connection issue. Check your network and refresh.';
  }
  return 'Failed to load. Please try again.';
}

// format report
function formatText(input) {
    let formatted = input.replace(/## (Key Insights|Strengths|Growth Areas|Recommendations)/g, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, (_, group) => `<strong><em>${group.trim()}</em></strong>`)
        .replace(/[:\-]/g, "");
    return formatted;
}

// UI Helpers with iOS-safe operations
function showLoading(show) {
  const loader = document.getElementById('dashboard-loader');
  if (!loader) return;
  loader.style.display = show ? 'block' : 'none';
}

// iOS-safe DOM ready check
if (document.readyState !== 'loading') {
  initDashboard();
} else {
  document.addEventListener('DOMContentLoaded', initDashboard);
}