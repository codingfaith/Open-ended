import { initializeFirebase } from './auth.js';

// DOM elements
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message");

// Toggle dashboard visibility
previousBtn.addEventListener("click", () => {
        if (dashboardResult.classList.contains("hide")) {
        dashboardResult.classList.remove("hide");
        dashboardResult.classList.add("show");
        document.getElementById('results-btnTxt').textContent = "← Back";
        
    } else {
        dashboardResult.classList.remove("show");
        dashboardResult.classList.add("hide");
        document.getElementById('results-btnTxt').textContent = "See previous results";
    }

    if (dashboardImg.classList.contains("hide")) {
        dashboardImg.classList.remove("hide");
        dashboardImg.classList.add("show");
    } else {
        dashboardImg.classList.remove("show");
        dashboardImg.classList.add("hide");
    } 
});

// Main execution wrapper
async function initDashboard() {
  try {
    showLoading(true);
    
    // 1. Initialize Firebase first
    const { auth, db } = await initializeFirebase();
    console.log('Firebase initialized, starting dashboard...');

    // 2. Check authentication state
    const user = auth.currentUser;
    if (!user) {
      showError('Please log in to view your results');
      return;
    }

    // 3. Get user data
    const data = await getUserAttemptsWithProfile(user.uid, db);
    console.log('User data loaded:', data);
    
    // 4. Display data
    displayData(data);
  } catch (error) {
    console.error('Dashboard initialization failed:', error);
    showError('Failed to load dashboard. Please refresh or try again later.');
  } finally {
    showLoading(false);
  }
}

// Data fetching function with enhanced error handling
async function getUserAttemptsWithProfile(userId, db) {
  try {
    const [userDoc, attemptsSnapshot] = await Promise.all([
      db.collection("users").doc(userId).get(),
      db.collection("userResults").doc(userId)
        .collection("attempts")
        .orderBy("timestamp", "desc")
        .get()
    ]);

    if (!userDoc.exists) {
      throw new Error("User profile not found");
    }

    return {
      userProfile: userDoc.data(),
      attempts: attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp?.toDate().toLocaleString()
      }))
    };
  } catch (error) {
    console.error("Error fetching user attempts:", error);
    if (error.code === 'permission-denied') {
      throw new Error("You don't have permission to view these results");
    }
    throw error;
  }
}

// Display function with empty state handling
function displayData(data) {
  document.getElementById('greeting').textContent += `${data.userProfile.firstName}!`
  const container = document.getElementById('previous-results-details');
  const hasAttempts = data.attempts && data.attempts.length > 0;
  
  dashboardResult.innerHTML = `
    <div id="previous-results-content">
      <h3>Your Quiz Attempts</h3>
      <div class="attempts-list">
        ${hasAttempts ? data.attempts.map(attempt => `
          <div class="attempt-card">
            <span class="attempt-date">${attempt.date}</span>
            <span  class="attempt-score">Score: ${attempt.score}%</span>
            <span  class="attempt-class">${attempt.classification}</span>
            <span  class="attempt-report hide">${attempt.report}</span>
            <button id="see-last-report">See report</button><br><br>
          </div>
        `).join('') : `
          <div class="no-attempts">
            <span>You have no results to show yet.</span>
            <span>Complete your first quiz to see your results here! 😊</span >
          </div>
        `}
      </div>
    </div>`;
}

// UI Helper functions
function showLoading(show) {
  const loader = document.getElementById('dashboard-loader');
  if (loader) {
    loader.style.display = show ? 'block' : 'none';
  }
}

function showError(message) {
  dashboardErrorMessage.textContent = message;
  dashboardErrorMessage.style.display = 'block';
  setTimeout(() => {
    dashboardErrorMessage.style.display = 'none';
  }, 5000);
}

// Start the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);