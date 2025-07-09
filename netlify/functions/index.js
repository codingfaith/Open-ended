// const admin = require('firebase-admin');

// // Initialize Firebase Admin SDK
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
//   })
// });

// // Set custom claim for the first admin
// const uid = 'CuWYY1OYXPSr34jXgvh5MX5nvQi2';
// admin.auth().setCustomUserClaims(uid, { admin: true })
//   .then(() => {
//     console.log(`Success! User ${uid} is now an admin.`);
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Error setting admin claim:', error);
//     process.exit(1);
//   });