import { initializeFirebase } from './auth.js';
initializeFirebase(); // Runs before any Firebase operations

//grab html elements
const dashboardImg = document.getElementById("dashboard-img")
const previousBtn = document.getElementById("dashboard-results")
const dashboardResult = document.getElementById("previous-results")

previousBtn.addEventListener("click",()=>{
    if (dashboardResult.classList.contains("hide")) {
        dashboardResult.classList.remove("hide");
        dashboardResult.classList.add("show");
    } else {
        dashboardResult.classList.remove("show");
        dashboardResult.classList.add("hide");
    }

    if (dashboardImg.classList.contains("hide")) {
        dashboardImg.classList.remove("hide");
        dashboardImg.classList.add("show");
    } else {
        dashboardImg.classList.remove("show");
        dashboardImg.classList.add("hide");
    } 
})

import { initializeFirebase } from './auth.js';

// Main execution wrapper
async function initDashboard() {
  try {
    // 1. Initialize Firebase first
    const { auth, db } = await initializeFirebase();
    console.log('Firebase initialized, starting dashboard...');

    // 2. Check authentication state
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in');
      // Redirect to login or show login UI
      return;
    }

    // 3. Get user data
    const data = await getUserAttemptsWithProfile(user.uid, db);
    console.log('User data loaded:', data);
    
    // 4. Display data
    displayData(data);
  } catch (error) {
    console.error('Dashboard initialization failed:', error);
    // Show error to user
    document.getElementById('error-message').textContent = 
      'Failed to load dashboard. Please refresh or try again later.';
  }
}

// Modified data fetching function
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
    throw error;
  }
}

// Display function
function displayData(data) {
  dashboardResult.innerHTML = `<h1>Welcome, ${data.userProfile.firstName}!</h1>`
  const container = document.getElementById('previous-results');
  container.innerHTML = `
    <h3>Your Quiz Attempts</h3>
    <div class="attempts-list">
      ${data.attempts.map(attempt => `
        <div class="attempt-card">
          <p class="attempt-date">${attempt.date}</p>
          <p class="attempt-score">Score: ${attempt.score}%</p>
          <p class="attempt-class">${attempt.classification}</p>
        </div>
      `).join('')}
    </div>
  `;
}

// Start the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);