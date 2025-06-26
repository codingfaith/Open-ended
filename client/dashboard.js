// import { initializeFirebase } from './auth.js';

// // DOM elements
// const dashboardImg = document.getElementById("dashboard-img");
// const previousBtn = document.getElementById("dashboard-results");
// const startAssessment = document.getElementById("redirect-link");
// const dashboardResult = document.getElementById("previous-results");
// const dashboardErrorMessage = document.getElementById("dashboard-error-message");

// // Toggle dashboard visibility
// previousBtn.addEventListener("click", () => {
//         if (dashboardResult.classList.contains("hide")) {
//         dashboardResult.classList.remove("hide");
//         dashboardResult.classList.add("show");
//         document.getElementById('results-btnTxt').textContent = "←Go back";
        
//     } else {
//         dashboardResult.classList.remove("show");
//         dashboardResult.classList.add("hide");
//         document.getElementById('results-btnTxt').textContent = "See previous results";
//     }

//     if (dashboardImg.classList.contains("hide")) {
//         dashboardImg.classList.remove("hide");
//         dashboardImg.classList.add("show");
//     } else {
//         dashboardImg.classList.remove("show");
//         dashboardImg.classList.add("hide");
//     } 
// });

// // Main execution wrapper
// async function initDashboard() {
//   try {
//     showLoading(true);
    
//     // 1. Initialize Firebase first
//     const { auth, db } = await initializeFirebase();
//     console.log('Firebase initialized, starting dashboard...');

//     // 2. Check authentication state
//     const user = auth.currentUser;
//     if (!user) {
//       showError('Please log in to view your results');
//       return;
//     }

//     // 3. Get user data
//     const data = await getUserAttemptsWithProfile(user.uid, db);
//     console.log('User data loaded:', data);
    
//     // 4. Display data
//     displayData(data);
//   } catch (error) {
//     console.error('Dashboard initialization failed:', error);
//     showError('Failed to load dashboard. Please refresh or try again later.');
//   } finally {
//     showLoading(false);
//   }
// }

// // Data fetching function with enhanced error handling
// async function getUserAttemptsWithProfile(userId, db) {
//   try {
//     const [userDoc, attemptsSnapshot] = await Promise.all([
//       db.collection("users").doc(userId).get(),
//       db.collection("userResults").doc(userId)
//         .collection("attempts")
//         .orderBy("timestamp", "desc")
//         .get()
//     ]);

//     if (!userDoc.exists) {
//       throw new Error("User profile not found");
//     }

//     return {
//       userProfile: userDoc.data(),
//       attempts: attemptsSnapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data(),
//         date: doc.data().timestamp?.toDate().toLocaleString()
//       }))
//     };
//   } catch (error) {
//     console.error("Error fetching user attempts:", error);
//     if (error.code === 'permission-denied') {
//       throw new Error("You don't have permission to view these results");
//     }
//     throw error;
//   }
// }

// function formatText(input) {
//     let formatted = input.replace(/## (Key Insights|Strengths|Growth Areas|Recommendations)/g, '<h2>$1</h2>')
//         .replace(/\*\*(.*?)\*\*/g, (_, group) => `<strong><em>${group.trim()}</em></strong>`)
//         .replace(/[:\-]/g, "");
//     return formatted;
// }

// // Display function with empty state handling
// function displayData(data) {
//   document.getElementById('greeting').textContent += `${data.userProfile.firstName}!`;
//   const container = document.getElementById('previous-results-details');
//   const hasAttempts = data.attempts && data.attempts.length > 0;
  
//   dashboardResult.innerHTML = `
//     <div id="previous-results-content">
//       <h3>Your Test Attempts</h3>
//       <div class="attempts-list">
//         ${hasAttempts ? data.attempts.map((attempt, index) => `
//           <div class="attempt-card">
//             <span class="attempt-date">${attempt.date}</span>
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
//     </div>`;

//   // Add event listeners to all report buttons
//   if (hasAttempts) {
//     const reportButtons = document.querySelectorAll('.last-reportBtn');
//     reportButtons.forEach(button => {
//       button.addEventListener('click', function() {
//         const index = this.getAttribute('data-index');
//         const reportDiv = document.getElementById(`report-${index}`);
        
//         // Toggle the display of the report
//         reportDiv.classList.toggle('hide');
        
//         // Change button text based on state
//         this.textContent = reportDiv.classList.contains('hide') ? 'See report' : 'Hide report';
//       });
//     });
//   }
// }

// // UI Helper functions
// function showLoading(show) {
//   const loader = document.getElementById('dashboard-loader');
//   if (loader) {
//     loader.style.display = show ? 'block' : 'none';
//   }
// }

// function showError(message) {
//   dashboardErrorMessage.textContent = message;
//   dashboardErrorMessage.style.display = 'block';
//   setTimeout(() => {
//     dashboardErrorMessage.style.display = 'none';
//   }, 5000);
// }

// // Start the dashboard when DOM is ready
// document.addEventListener('DOMContentLoaded', initDashboard);

import { initializeFirebase } from './auth.js';

// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');

// iOS-specific event listener with passive option
const addIOSSafeListener = (element, event, handler) => {
  if (!element) return;
  element.addEventListener(event, handler, { passive: true });
};

// Toggle dashboard visibility with iOS-safe classList
addIOSSafeListener(previousBtn, "click", () => {
  if (!dashboardResult || !dashboardImg) return;
  
  dashboardResult.classList.toggle("hide");
  dashboardResult.classList.toggle("show");
  dashboardImg.classList.toggle("hide");
  dashboardImg.classList.toggle("show");
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

// Display function with iOS-safe DOM operations
function displayData(data) {
  if (!dashboardResult) return;
  
  const container = document.getElementById('previous-results-details');
  if (!container) return;
  
  const hasAttempts = data.attempts?.length > 0;
  const sanitizedFirstName = data.userProfile?.firstName || 'User';
  
  // iOS-safe template rendering
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <h1>Welcome, ${sanitizedFirstName}!</h1>
    <div id="previous-results-content">
      <h3>Your Quiz Attempts</h3>
      <div class="attempts-list">
        ${hasAttempts ? data.attempts.map(attempt => `
          <div class="attempt-card">
            <p class="attempt-date">${new Date(attempt.timestamp?.seconds * 1000).toLocaleString()}</p>
            <p class="attempt-score">Score: ${attempt.score}%</p>
            <p class="attempt-class">${attempt.classification}</p>
          </div>
        `).join('') : `
          <div class="no-attempts">
            <p>You have no results to show yet.</p>
            <p>Complete your first quiz to see your results here! 😊</p>
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