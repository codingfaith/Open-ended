import { initializeFirebase } from './auth.js';

// Paystack Payment Function
function payWithPaystack() {
    const user = firebase.auth().currentUser;

    let handler = PaystackPop.setup({
        key: 'pk_live_7752e289054750e49dadba1b158c1b7c9c676846', 
        amount: 99, 
        currency: 'ZAR',
        ref: 'tx_' + Math.floor((Math.random() * 1000000000) + 1), // Unique transaction reference
        callback: function(response) {
            // Update the most recent attempt in Firestore
            if (user) {
                const db = firebase.firestore();
                const attemptsRef = db.collection('userResults').doc(user.uid).collection('attempts');

                // Query the most recent attempt (ordered by timestamp or attemptNumber)
                attemptsRef
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get()
                    .then((querySnapshot) => {
                        if (!querySnapshot.empty) {
                            const latestAttemptDoc = querySnapshot.docs[0];
                            // Update the attempt with payment status
                            latestAttemptDoc.ref.update({
                                payment: 'success',
                                paymentReference: response.reference,
                                paymentTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                            }).then(() => {
                                // Redirect to results page
                                window.location.replace("https://ubuntex.netlify.app/dashboard");
                            }).catch((error) => {
                                console.error('Error updating attempt:', error);
                                alert('Payment recorded, but failed to update attempt. Contact support.');
                            });
                        } else {
                            console.error('No attempts found for user:', user.uid);
                            alert('Payment successful, but no attempt found. Contact support.');
                        }
                    }).catch((error) => {
                        console.error('Error fetching latest attempt:', error);
                        alert('Payment successful, but failed to retrieve attempt. Contact support.');
                    });
            } else {
                alert('Payment successful, but no user logged in. Contact support.');
            }
        },
        onClose: function() {
            alert('Payment window closed.');
        }
    });
    handler.openIframe(); // Open the Paystack payment pop-up
}
document.getElementById('payButton').addEventListener('click', payWithPaystack);