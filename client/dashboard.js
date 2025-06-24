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

async function getUserAttemptsWithProfile(userId) {
  const db = firebase.firestore();
  
  try {
    // Fetch user profile and attempts simultaneously
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
      userProfile: {
        firstName: userDoc.data().firstName,
        lastName: userDoc.data().lastName // Added lastName as example
      },
      attempts: attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert timestamp to readable date
        date: doc.data().timestamp?.toDate().toLocaleString()
      }))
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error; // Re-throw for calling code to handle
  }
}

// Wrap in async function since top-level await isn't always available
async function displayUserData() {
  const auth = firebase.auth();
  const user = auth.currentUser;

  if (user) {
    try {
      const data = await getUserAttemptsWithProfile(user.uid);
      console.log("User:", data.userProfile);
      console.log("Attempts:", data.attempts);
      
      // Display in UI
      data.attempts.forEach(attempt => {
        console.log(`
          ${data.userProfile.firstName}'s Attempt (${attempt.date}):
          Score: ${attempt.score}%
          Classification: ${attempt.classification}
        `);
      });
    } catch (error) {
      console.error("Failed to load user data:", error);
      // Show error to user in your UI
    }
  } else {
    console.log("No user logged in");
    // Handle logged-out state
  }
}

// Execute
displayUserData();