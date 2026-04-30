// netlify/functions/getConfig.js
exports.handler = async () => {
  const config = {
    apiKey: process.env.FBA_API_KEY,
    authDomain: process.env.FBA_AUTH_DOMAIN,
    projectId: process.env.FBA_PROJECT_ID,
    storageBucket: process.env.FBA_STRG_BKT,
    messagingSenderId: process.env.FBA_MSG_SENDER_ID,
    appId: process.env.FBA_APP_ID,
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
