import { handleLogout, initializeFirebase } from './auth.js';
import { payWithPaystack } from './payment.js'
// DOM elements with null checks for iOS
const dashboardImg = document.getElementById("dashboard-img");
const previousBtn = document.getElementById("dashboard-results");
const dashboardResult = document.getElementById("previous-results");
const dashboardErrorMessage = document.getElementById("dashboard-error-message") || document.createElement('div');
const resultsBtnTxt = document.getElementById('results-btnTxt') || document.createElement('span');
const adminView = document.getElementById('admin-results-container');
let usersNum = 0;
let average = 0;
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

    if (await checkAdmin()) {
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

async function calculateGlobalAverageScore(db) {
  try {
    const usersSnapshot = await db.collection("users").get();
    let totalScore = 0;
    let userCount = 0;

    const scorePromises = usersSnapshot.docs.map(async (userDoc) => {
      const attemptsSnapshot = await db.collection("userResults")
        .doc(userDoc.id)
        .collection("attempts")
        .limit(1)
        .get();

      if (!attemptsSnapshot.empty) {
        const attempt = attemptsSnapshot.docs[0].data();
        totalScore += parseFloat(attempt.score)
        console.log(attempt.score)
        userCount++;
      }
    });

    await Promise.all(scorePromises);

    // Round to 2 decimal places
    const averageScore = userCount > 0 
      ? Math.round((totalScore / userCount) * 100) / 100
      : 0;
    return averageScore;
  
  } catch (error) {
    console.error("Error calculating global average:", error);
    throw error;
  }
}

async function displayUserResults(userDocs, db) {
  if (!adminView) return;
  average = await calculateGlobalAverageScore(db);
  message.innerHTML = `<h3>${usersNum} users have taken the test!</h3>
  Their average score is ${average}% <br><span style="font-size:small">(scroll below to see users)</span>`;

  document.getElementById('logoutContainer').innerHTML = `
  <button id="logout-buttonAdmin" class="logout-buttonAdmin" type="button">
    <span class="button-text">Log Out</span>
    <span class="loading-spinner" style="display:none;">
        <svg class="spinner" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
        </svg>
    </span>
  </button>`;
  document.getElementById('logoutContainer').style.display="flex";
  document.getElementById('logout-buttonAdmin').addEventListener('click', handleLogout)
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
      <p>Last login: ${user.lastLogin?.toDate().toLocaleString() || 'Unknown'}</p>
      <button class="view-user-btn" aria-label="View results for ${user.firstName || 'user'}">View Results</button><hr>`;
    
    const viewBtn = userCard.querySelector('.view-user-btn');
    if (viewBtn) {
      addIOSSafeListener(viewBtn, 'click', async function() {
        try {
          showLoading(true);
          const data = await getUserAttemptsWithProfile(doc.id, db);
          displayAdminData(data);
          adminView.scrollIntoView({ behavior: "smooth" });
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
  greeting.textContent = `Hi ${data.userProfile?.firstName || 'User'}!`;

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
    <h3 style="text-align:center;">Your Test Attempts</h3>
    <h4 class="score-levels">(NB: Highest scores translate to Ubuntex Level 1, Lowest scores to Ubuntex Level 6)</h4>
    <div class="attempts-list">
      ${data.attempts.map((attempt, index) => `
        <div class="attempt-card">
          ${attempt.payment === "success" ? `
            <span class="attempt-date">${formatAttemptDate(attempt.timestamp)}</span>
            <span class="attempt-score">Score: ${attempt.score}%</span>
            <span class="attempt-class">${attempt.classification}</span></span>
            <button class="report-toggle-btn" data-index="${index}">
              See report
            </button>
            <div class="report-content hide" id="report-${index}">
              <div>
                <img src="./Plus94_logo2.png" alt="Plus94 logo" class="p94_logo">
                <h1>Ubuntex</h1>
              </div>
              <h1 id="report-name">Report for ${data.userProfile.firstName} ${data.userProfile.lastName}</h1>
              ${formatText(attempt.report)}
              <button class="downloadReportBtn">Download Report</button>
            </div>
          ` : `
            <span class="attempt-date">${formatAttemptDate(attempt.timestamp)}</span>
            <button class="pay-to-access-btn" data-attempt-number="${attempt.attemptNumber}">Pay to access results</button>
          `}
        </div>
        <hr><br>
      `).join('')}
    </div>
  `;

  // Add to DOM
  dashboardResult.appendChild(contentDiv);
  document.querySelector(".downloadReportBtn").addEventListener("click", downloadPDF);

  // Check if pay-to-access-btn elements exist before adding event listeners
  const payButtons = document.querySelectorAll('.pay-to-access-btn');
  if (payButtons.length > 0) {
    payButtons.forEach(button => {
      button.addEventListener('click', () => {
        const attemptNumber = button.dataset.attemptNumber;
        payWithPaystack(attemptNumber);
      });
    });
  }
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
  <div class="attempts-list">
  ${adminData.attempts.map((attempt, index) => `
    <div class="admin-attempt-card">
      <div class="attempt-meta">
        <span class="attempt-date">Date and time: ${formatAttemptDate(attempt.timestamp)}</span>
      </div>
      <div class="attempt-stats">
        <span class="attempt-score">Score: ${attempt.score}%</span><br>
        <span class="attempt-class">${attempt.classification}</span><br>
        <span class="attempt-payment">Payment Status: ${attempt?.payment ? attempt.payment.charAt(0).toUpperCase() + attempt.payment.slice(1) : 'Not Paid'}</span><br>
        <button class="admin-answers-toggle" data-index="${index}">
          Toggle Answers
        </button><br>
        <button class="admin-report-toggle" data-index="${index}">
          Toggle Full Report
        </button>
        <hr>
      </div>
      <div class="admin-report-content hide" id="admin-report-${index}">
        ${formatText(attempt.report)}<hr>
      </div>
  
      <div class="admin-answers-content hide" id="admin-answers-${index}">
        <table class="answers-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>User Answer</th>
            </tr>
          </thead>
          <tbody>
            ${attempt.answers.map(answer => `
              <tr>
                <td>${answer.question}</td>
                <td>${answer.userAnswer}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <hr>
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
}

// Helper function for date formatting
function formatAttemptDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'Unknown date';
  return new Date(timestamp.seconds * 1000).toLocaleString();
}

function downloadPDF() {
  const element = document.querySelector(".report-content");
  document.querySelector(".downloadReportBtn").style.display = "none";
  
  if (!element) {
    console.error("Could not find .report-content element");
    return;
  }

  // Save original styles
  const originalStyles = {
    visibility: element.style.visibility,
    position: element.style.position,
    overflow: element.style.overflow,
    margin: element.style.margin
  };

  // Make element visible and centered
  element.style.visibility = 'visible';
  element.style.position = 'static';
  element.style.overflow = 'visible';
  element.style.margin = '0 auto';

  const opt = {
    margin: [5, 5, 5, 5], // top, left, bottom, right
    filename: 'ubuntex-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      scrollY: 0,
      x: 0,
      y: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait'
    }
  };

  setTimeout(() => {
    html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        console.log('PDF generated successfully');
        Object.assign(element.style, originalStyles);
      })
      .catch((error) => {
        console.error('PDF generation failed:', error);
        Object.assign(element.style, originalStyles);
      })
      .save();
  }, 1000);
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