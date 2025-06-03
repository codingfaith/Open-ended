// netlify/functions/getConfig.js
exports.handler = async () => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID
    
        }
      })
    };
  } catch (error) {
    console.error('Config error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration error' })
    };
  }
};