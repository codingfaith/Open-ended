import { initializeFirebase } from './auth.js';

// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');
const resultsBtnTxt = document.getElementById('results-btnTxt') || document.createElement('span');

async function makeUserAdmin(uid) {
  const response = await fetch('/.netlify/functions/setAdminClaim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include auth token if you want to verify permissions
      'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
    },
    body: JSON.stringify({ uid })
  });
  
  const result = await response.json();
  return result;
}

makeUserAdmin(CuWYY1OYXPSr34jXgvh5MX5nvQi2)
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
    
    // iOS workaround for Firebase init timing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { auth, db } = await initializeFirebase();
    console.log('Firebase initialized');

    // iOS-specific auth check
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

    const data = await getUserAttemptsWithProfile(user.uid, db);
    console.log('User data loaded');
    
    // iOS-safe DOM update
    requestAnimationFrame(() => displayData(data));
  } catch (error) {
    console.error('Dashboard failed:', error);
    showError(iOSErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

// iOS-specific error messaging
function iOSErrorMessage(error) {
  if (error.message.includes('Firebase')) {
    return 'Connection issue. Check your network and refresh.';
  }
  return 'Failed to load. Please try again.';
}

// Data fetching with iOS timeout
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

function formatText(input) {
    let formatted = input.replace(/## (Key Insights|Strengths|Growth Areas|Recommendations)/g, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, (_, group) => `<strong><em>${group.trim()}</em></strong>`)
        .replace(/[:\-]/g, "");
    return formatted;
}

// Display function with iOS-safe DOM operations
function displayData(data) {
  if (!dashboardResult) return;
  
  const greeting = document.getElementById('greeting');
  if (greeting) {
    greeting.textContent += `${data.userProfile?.firstName || 'User'}!`;
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

// UI Helpers with iOS-safe operations
function showLoading(show) {
  const loader = document.getElementById('dashboard-loader');
  if (!loader) return;
  loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
  dashboardErrorMessage.textContent = message;
  dashboardErrorMessage.style.display = 'block';
  setTimeout(() => {
    if (dashboardErrorMessage) {
      dashboardErrorMessage.style.display = 'none';
    }
  }, 5000);
}

// iOS-safe DOM ready check
if (document.readyState !== 'loading') {
  initDashboard();
} else {
  document.addEventListener('DOMContentLoaded', initDashboard);
}