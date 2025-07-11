import { initializeFirebase } from './auth.js';

// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const adminDashboardResult = document.getElementById("admin-previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');
const resultsBtnTxt = document.getElementById('results-btnTxt') || document.createElement('span');
const adminView = document.getElementById('admin-results-container')

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
      loadRecentUsers(db)
      document.getElementById('dashboard-assess').innerHTML =` 
        <div id="admin-previous-results">
          <h1 id="admin-greeting"></h1>
        </div>`;
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


function displayUserResults(userDocs, db) {
  if (!adminView) return;
  
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
        console.log('button clicked');
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
    
    adminView.appendChild(userCard);
  });
}

async function loadRecentUsers(db) {
  try {
    showLoading(true);
    const usersSnapshot = await db.collection("users")
      .orderBy("lastLogin", "desc")
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
// function displayData(data, isAdminView = false) {
//   if (!dashboardResult || !adminDashboardResult) return;
  
//   const greeting = document.getElementById('greeting');
//   const adminGreeting = document.getElementById('admin-greeting');

//   if (greeting || adminGreeting) {
//     if (isAdminView) {
//       adminGreeting.textContent = `Viewing results for ${data.userProfile?.firstName || 'User'} ${data.userProfile?.lastName || ''}`;
//     } else {
//       greeting.textContent = `Welcome back ${data.userProfile?.firstName || 'User'}!`;
//     }
//   }
  
//   const container = document.getElementById('previous-results-details');
//   if (!container || adminView) return;
  
//   const hasAttempts = data.attempts?.length > 0;
  
//   // iOS-safe template rendering
//   const tempDiv = document.createElement('div');
//   tempDiv.innerHTML = `
//     <div id="previous-results-content">
//       <h3>Your Test Attempts</h3>
//       <div class="attempts-list">
//         ${hasAttempts ? data.attempts.map((attempt, index) => `
//           <div class="attempt-card">
//             <span class="attempt-date">${new Date(attempt.timestamp?.seconds * 1000).toLocaleString()}</span>
//             <span class="attempt-score">Score: ${attempt.score}%</span>
//             <span class="attempt-class">${attempt.classification}</span>
//             <button class="last-reportBtn" data-index="${index}">See report</button><br><br>
//           </div>
//           <div class="show-dash-report hide" id="report-${index}">${formatText(attempt.report)}<hr></br></div>
//         `).join('') : `
//           <div class="no-attempts">
//             <span>You have no results to show yet.</span>
//             <span>Complete your first quiz to see your results here! 😊</span>
//           </div>
//         `}
//       </div>
//     </div>
//   `;
  
//   // iOS-safe DOM update
//   if(dashboardResult){
//     console.log("still old container is there");
//     while (dashboardResult.firstChild) {
//     dashboardResult.removeChild(dashboardResult.firstChild);
//   }
//   dashboardResult.appendChild(tempDiv);
//   } else if(adminDashboardResult){
//     console.log("container is there");
//     while (adminDashboardResult.firstChild) {
//     adminDashboardResult.removeChild(adminDashboardResult.firstChild);
//   }
//   adminDashboardResult.appendChild(tempDiv);
//   }


//   // Add event listeners to all report buttons
//   if (hasAttempts) {
//     const reportButtons = document.querySelectorAll('.last-reportBtn');
//     reportButtons.forEach(button => {
//       addIOSSafeListener(button, 'click', function() {
//         const index = this.getAttribute('data-index');
//         const reportDiv = document.getElementById(`report-${index}`);
        
//         if (reportDiv) {
//           reportDiv.classList.toggle('hide');
//           this.textContent = reportDiv.classList.contains('hide') ? 'See report' : 'Hide report';
//         }
//       });
//     });
//   }
// }

function displayData(data, isAdminView = false) {
  // Debugging logs
  console.log('Displaying data for:', isAdminView ? 'Admin' : 'User');
  console.log('Data received:', data);

  // Determine which containers to use
  const greetingElement = isAdminView 
    ? document.getElementById('admin-greeting')
    : document.getElementById('greeting');
  
  const resultsContainer = isAdminView
    ? document.getElementById('admin-previous-results')
    : document.getElementById('previous-results');

  // Validate we have the necessary elements
  if (!greetingElement || !resultsContainer) {
    console.error('Missing required elements:', {
      greetingElement,
      resultsContainer,
      isAdminView
    });
    return;
  }

  // Update greeting
  greetingElement.textContent = isAdminView
    ? `Viewing results for ${data.userProfile?.firstName || 'User'} ${data.userProfile?.lastName || ''}`
    : `Welcome back ${data.userProfile?.firstName || 'User'}!`;

  // Clear existing content
  while (resultsContainer.firstChild) {
    resultsContainer.removeChild(resultsContainer.firstChild);
  }

  // Create and populate new content
  const hasAttempts = data.attempts?.length > 0;
  const contentDiv = document.createElement('div');
  contentDiv.className = 'results-content';

  contentDiv.innerHTML = `
    <h3>${isAdminView ? 'User' : 'Your'} Test Attempts</h3>
    <div class="attempts-list">
      ${hasAttempts ? data.attempts.map((attempt, index) => `
        <div class="attempt-card">
          <span class="attempt-date">${formatAttemptDate(attempt.timestamp)}</span>
          <span class="attempt-score">Score: ${attempt.score}%</span>
          <span class="attempt-class">${attempt.classification}</span>
          <button class="last-reportBtn" data-index="${index}">See report</button>
          <div class="show-dash-report hide" id="report-${index}">
            ${formatText(attempt.report)}
            <hr>
          </div>
        </div>
      `).join('') : `
        <div class="no-attempts">
          <p>No results to show yet.</p>
          <p>Complete your first quiz to see results here! 😊</p>
        </div>
      `}
    </div>
  `;

  // Append to the correct container
  resultsContainer.appendChild(contentDiv);

  // Add event listeners for report toggles
  if (hasAttempts) {
    contentDiv.querySelectorAll('.last-reportBtn').forEach(button => {
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

  // Ensure admin view is visible if this is an admin view
  if (isAdminView && adminView) {
    adminView.classList.remove('hide');
    adminView.style.display = 'block';
  }
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