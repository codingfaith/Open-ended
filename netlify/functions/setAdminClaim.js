const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { uid } = JSON.parse(event.body);
 
    // Set custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `User ${uid} is now an admin` })
    };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};