import { initializeFirebase } from './auth.js';

// Paystack Payment Function
export function payWithPaystack(attemptNumber = null) {
    const user = firebase.auth().currentUser;
    const email = user.email;

    let handler = PaystackPop.setup({
        key: 'pk_live_7752e289054750e49dadba1b158c1b7c9c676846', 
        email: email,
        amount: 9900, 
        currency: 'ZAR',
        ref: 'tx_' + Math.floor((Math.random() * 1000000000) + 1), // Unique transaction reference
        callback: function(response) {

            // Update the most recent attempt in Firestore
            if (user) {
                const db = firebase.firestore();
                const attemptsRef = db.collection('userResults').doc(user.uid).collection('attempts');

               // Query the specific attempt by attemptNumber, or fallback to latest
                const query = attemptNumber
                    ? attemptsRef.where('attemptNumber', '==', parseInt(attemptNumber))
                    : attemptsRef.orderBy('timestamp', 'desc').limit(1);

                query
                    .get()
                    .then((querySnapshot) => {
                        if (!querySnapshot.empty) {
                            const attemptDoc = querySnapshot.docs[0];
                            // Update the attempt with payment status
                            attemptDoc.ref.update({
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
document.getElementById('payButton')?.addEventListener('click', () => payWithPaystack());
