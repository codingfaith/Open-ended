// netlify/functions/webhook.js
const admin = require('firebase-admin');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('Missing Paystack secret key');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  // Verify the signature to ensure it's from Paystack
  const hash = crypto.createHmac('sha512', secret)
    .update(event.body)
    .digest('hex');

  if (hash !== event.headers['x-paystack-signature']) {
    console.log('Invalid signature');
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // Parse the event body
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    console.error('Error parsing payload:', err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  // Respond with 200 OK immediately to acknowledge (prevents retries)
  // Handle the event asynchronously if needed, but for simplicity, we do it here
  if (payload.event === 'charge.success') {
    try {
      // Initialize Firebase Admin SDK if not already (singleton pattern)
      if (!admin.apps.length) {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Restore newlines
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Add other optional fields if you set them as env vars
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          // If Realtime Database: databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }

      const db = admin.firestore(); 

      // Extract user ID from metadata 
    const userId = payload.data.metadata.userId;
    if (userId) {
        await admin.firestore().collection('users').doc(userId).update({
            paymentStatus: 'success',
            transactionReference: payload.data.reference,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
      // Update the user's payment status in Firestore (adjust path as needed)
      await db.collection('users').doc(userId).update({
        paymentStatus: 'success',
        // Optionally add more fields like transaction reference, amount, etc.
        transactionReference: payload.data.reference,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Payment verified and status updated for user: ${userId}`);
    } catch (err) {
      console.error('Error updating Firebase:', err);
      // You could queue a retry here, but for now, just log
    }
  } else {
    console.log(`Unhandled event: ${payload.event}`);
  }

  // Always return 200 OK to Paystack
  return { statusCode: 200, body: 'OK' };
};