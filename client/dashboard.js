import { initializeFirebase } from './auth.js';

// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');
const resultsBtnTxt = document.getElementById('results-btnTxt') || document.createElement('span');
const adminToggle = document.getElementById("admin-toggle") || document.createElement('div');
const adminView = document.getElementById("admin-view") || document.createElement('div');
const userSearch = document.getElementById("user-search") || document.createElement('input');
const adminResultsContainer = document.getElementById('admin-results-container')

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
      console.log("Show admin controls");
      setupAdminView(db);
      document.getElementById('dashboard-assess').style.display = "none";
    } else {
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


// Admin functionality
function setupAdminView(db) {
  console.log("Set admin view called")
  // Show admin controls
  adminToggle.style.display = 'block';
  adminView.style.display = 'block';
  userSearch.style.display = 'block';
  
  // Set up admin toggle
  addIOSSafeListener(adminToggle, 'click', () => {
    adminView.classList.toggle('hide');
  });

  // Set up user search
  addIOSSafeListener(userSearch, 'input', async (e) => {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;
  
  try {
    showLoading(true);
  
    // Search by firstName using '>= and <=' trick for partial matching
    const usersSnapshot = await db.collection("users")
      .where("firstName", ">=", searchTerm)
      .where("firstName", "<=", searchTerm + '\uf8ff')
      .limit(10)
      .get();
    
    displayUserResults(usersSnapshot.docs, db);
  } catch (error) {
    console.error("Search error:", error);
    showError("Failed to search users");
  } finally {
    showLoading(false);
  }
});

  // Initial load of recent users
  loadRecentUsers(db);
}

function displayUserResults(userDocs, db) {
  if (!adminResultsContainer) return;
  
  // Clear existing content safely
  while (adminResultsContainer.firstChild) {
    adminResultsContainer.removeChild(adminResultsContainer.firstChild);
  }

  if (userDocs.length === 0) {
    adminResultsContainer.innerHTML = '<p>No users found</p>';
    return;
  }

  userDocs.forEach(doc => {
    const user = doc.data();
    const userCard = document.createElement('div');
    userCard.className = 'admin-user-card';
    userCard.setAttribute('data-uid', doc.id);
    userCard.innerHTML = `
      <h4>${user.firstName || ''} ${user.lastName || ''}</h4>
      <p>Email: ${user.email || 'No email'}</p>
      <p>Last login: ${user.lastLogin?.toDate().toLocaleString() || 'Unknown'}</p>
      <button class="view-user-btn" aria-label="View results for ${user.firstName || 'user'}">View Results</button><hr>`;
    
    const viewBtn = userCard.querySelector('.view-user-btn');
    if (viewBtn) {
      addIOSSafeListener(viewBtn, 'click', async function() {
        try {
          showLoading(true);
          const data = await getUserAttemptsWithProfile(doc.id, db);
          displayData(data, true);// Pass true to indicate admin view
        } catch (error) {
          console.error("Error loading user data:", error);
          showError("Failed to load user data");
        } finally {
          showLoading(false);
        }
      });
    }
    
    adminResultsContainer.appendChild(userCard);
  });
}

// Update loadRecentUsers call in setupAdminView:
async function loadRecentUsers(db) {
  console.log("loadRecentUsers called")
  try {
    showLoading(true);
    const usersSnapshot = await db.collection("users")
      .orderBy("lastLogin", "desc")
      .limit(10)
      .get();
    
    displayUserResults(usersSnapshot.docs, db);
  } catch (error) {
    showError("Failed to load recent users");
    console.error("Error loading recent users:", error);
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
// Modified displayData to handle admin view
function displayData(data, isAdminView = false) {
  if (!dashboardResult) return;
  
  const greeting = document.getElementById('greeting');
  if (greeting) {
    if (isAdminView) {
      greeting.textContent = `Viewing results for ${data.userProfile?.firstName || 'User'} ${data.userProfile?.lastName || ''}`;
    } else {
      greeting.textContent = `Welcome back ${data.userProfile?.firstName || 'User'}!`;
    }
  }
  
  const container = document.getElementById('previous-results-details');
  if (!container) return;
  
  const hasAttempts = data.attempts?.length > 0;
  
  // iOS-safe template rendering
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div id="previous-results-content">
      <h3>Your Test Attempts</h3>
      <div class="attempts-list">
        ${hasAttempts ? data.attempts.map((attempt, index) => `
          <div class="attempt-card">
            <span class="attempt-date">${new Date(attempt.timestamp?.seconds * 1000).toLocaleString()}</span>
            <span class="attempt-score">Score: ${attempt.score}%</span>
            <span class="attempt-class">${attempt.classification}</span>
            <button class="last-reportBtn" data-index="${index}">See report</button><br><br>
          </div>
          <div class="show-dash-report hide" id="report-${index}">${formatText(attempt.report)}<hr></br></div>
        `).join('') : `
          <div class="no-attempts">
            <span>You have no results to show yet.</span>
            <span>Complete your first quiz to see your results here! 😊</span>
          </div>
        `}
      </div>
    </div>
  `;
  
  // iOS-safe DOM update
  while (dashboardResult.firstChild) {
    dashboardResult.removeChild(dashboardResult.firstChild);
  }
  dashboardResult.appendChild(tempDiv);

  // Add event listeners to all report buttons
  if (hasAttempts) {
    const reportButtons = document.querySelectorAll('.last-reportBtn');
    reportButtons.forEach(button => {
      addIOSSafeListener(button, 'click', function() {
        const index = this.getAttribute('data-index');
        const reportDiv = document.getElementById(`report-${index}`);
        
        if (reportDiv) {
          reportDiv.classList.toggle('hide');
          this.textContent = reportDiv.classList.contains('hide') ? 'See report' : 'Hide report';
        }
      });
    });
  }
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