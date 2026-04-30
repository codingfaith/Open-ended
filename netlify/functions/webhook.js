// netlify/functions/webhook.js
const admin = require('firebase-admin');
const crypto = require('crypto');

// 🔥 Get correct Firebase app
const getFirebaseApp = (project) => {
  const existingApp = admin.apps.find(app => app.name === project);
  if (existingApp) return existingApp;

  let config;

  if (project === "projectA") {
    config = {
      projectId: process.env.FBA_PROJECT_ID,
      privateKey: process.env.FBA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FBA_CLIENT_EMAIL,
    };
  } else if (project === "projectB") {
    config = {
      projectId: process.env.FBB_PROJECT_ID,
      privateKey: process.env.FBB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FBB_CLIENT_EMAIL,
    };
  } else {
    throw new Error("Unknown project");
  }

  return admin.initializeApp(
    { credential: admin.credential.cert(config) },
    project
  );
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('Missing Paystack secret key');
    return { statusCode: 500, body: 'Server error' };
  }

  // ✅ Verify Paystack signature
  const hash = crypto.createHmac('sha512', secret)
    .update(event.body)
    .digest('hex');

  if (hash !== event.headers['x-paystack-signature']) {
    console.log('Invalid signature');
    return { statusCode: 400, body: 'Invalid signature' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    console.error('Invalid JSON');
    return { statusCode: 400, body: 'Bad request' };
  }

  if (payload.event === 'charge.success') {
    try {
      const project = payload.data?.metadata?.project;
      const userId = payload.data?.metadata?.userId;
      const attemptNumber = payload.data?.metadata?.attemptNumber;
      const reference = payload.data?.reference;

      if (!project || !userId) {
        console.error('Missing metadata');
        return { statusCode: 200, body: 'OK' };
      }

      const app = getFirebaseApp(project);
      const db = app.firestore();

      // 🔁 Prevent duplicate processing
      const txRef = db.collection('transactions').doc(reference);
      const existing = await txRef.get();

      if (existing.exists) {
        console.log('Duplicate webhook:', reference);
        return { statusCode: 200, body: 'OK' };
      }

      // ✅ Save transaction
      await txRef.set({
        reference,
        project,
        userId,
        amount: payload.data.amount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Update user
      await db.collection('users').doc(userId).update({
        paymentStatus: 'success',
        transactionReference: reference,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Update attempt (IMPORTANT)
      if (attemptNumber) {
        const attemptsRef = db.collection('userResults')
          .doc(userId)
          .collection('attempts');

        const query = await attemptsRef
          .where('attemptNumber', '==', parseInt(attemptNumber))
          .limit(1)
          .get();

        if (!query.empty) {
          await query.docs[0].ref.update({
            payment: 'success',
            paymentReference: reference,
            paymentTimestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`✅ Attempt updated for ${userId}`);
        }
      }

      console.log(`✅ Payment processed for ${userId} (${project})`);

    } catch (err) {
      console.error('Webhook error:', err);
    }
  }

  return { statusCode: 200, body: 'OK' };
};