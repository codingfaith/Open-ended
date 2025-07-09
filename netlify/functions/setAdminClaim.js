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
    // Verify authorization header exists
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { uid } = JSON.parse(event.body);

    // Verify the caller is an admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!decodedToken.admin) {
      return { statusCode: 403, body: 'Forbidden: Only admins can perform this action' };
    }

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