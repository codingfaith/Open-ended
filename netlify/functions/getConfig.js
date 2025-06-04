// netlify/functions/getConfig.js
exports.handler = async () => {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  const missing = Object.entries(config).filter(([key, value]) => !value);
  if (missing.length > 0) {
    console.error("Missing Firebase environment variables:", missing.map(([k]) => k));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing Firebase config values", missing: missing.map(([k]) => k) })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ firebaseConfig: config })
  };
};
