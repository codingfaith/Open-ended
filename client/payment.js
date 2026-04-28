import { initializeFirebase } from './auth.js';

// Paystack Payment Function
export function payWithPaystack(attemptNumber = null) {
    const user = firebase.auth().currentUser;

    if (!user) {
        alert("You must be logged in");
        return;
    }

    let handler = PaystackPop.setup({
        key: 'pk_live_7752e289054750e49dadba1b158c1b7c9c676846',
        email: user.email,
        amount: 9900,
        currency: 'ZAR',

        // ✅ Better unique reference
        ref: 'tx_' + Date.now(),

        // 🔥 CRITICAL: used by webhook
        metadata: {
            userId: user.uid,
            project: "projectA", // 👈 THIS project
            attemptNumber: attemptNumber || null
        },

        callback: function(response) {
            window.location.replace("https://ubuntex.plus94.tech/dashboard");
        },

        onClose: function() {
            alert('Payment window closed.');
        }
    });

    handler.openIframe();
}

document.getElementById('payButton')?.addEventListener('click', () => payWithPaystack());