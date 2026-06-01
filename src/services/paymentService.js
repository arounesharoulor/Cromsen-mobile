import Razorpay from '@codearcade/expo-razorpay';
import { Linking, Keyboard } from 'react-native';

export const RAZORPAY_KEY_ID = 'rzp_test_SNY1G9ELPHlY7P';

class PaymentService {
  async processPayment(orderData, userData) {
    return new Promise((resolve, reject) => {
      // 1. Fetch correct Key from backend
      fetch('https://api.cromsennest.com/api/payment/get-key')
        .then(res => res.json())
        .then(keyData => {
          const activeKey = keyData.key || RAZORPAY_KEY_ID;

          // Check if Razorpay wrapper is available
          if (Razorpay) {
            const options = {
              description: 'Order Payment',
              image: 'https://i.imgur.com/3g7nmJC.png',
              currency: orderData.currency || 'INR',
              key: activeKey.trim(),
              amount: orderData.amount,
              name: 'Cromsen',
              order_id: orderData.id,
              prefill: {
                email: userData?.email || '',
                contact: userData?.phone || '',
                name: userData?.name || ''
              },
              theme: { color: '#004694' }
            };
  
            Razorpay.open(options)
              .then(resolve)
              .catch(reject);
          } else {
            // FALLBACK: Use Browser Hosted Checkout if SDK is missing (Expo Go)
            console.log('Native SDK not found, falling back to browser...');
            
            // Cleanest possible URL for browser-based hosted checkout
            const checkoutUrl = `https://api.razorpay.com/v1/checkout/hosted?key_id=${activeKey.trim()}&order_id=${orderData.id}`;
            
            console.log('Redirecting to Razorpay:', checkoutUrl);
            
            // Dismiss keyboard to ensure navigation isn't blocked
            Keyboard.dismiss();

            Linking.canOpenURL(checkoutUrl).then(supported => {
              if (supported) {
                Linking.openURL(checkoutUrl).catch(err => console.error('Failed to open URL:', err));
              } else {
                console.error("Don't know how to open URI: " + checkoutUrl);
                alert("Cannot open payment page. Please check your browser settings.");
              }
            });
            
            reject({ code: 'BROWSER_OPENED', description: 'REDIRECTING' });
          }
        })
        .catch(err => reject({ code: 'INIT_ERROR', description: err.message }));
    });
  }

  /**
   * Signature Verification (Frontend helper - actual verification happens on backend)
   * The backend should use crypto.createHmac('sha256', secret) to verify.
   */
  async verifyOnBackend(paymentData, orderDetails) {
    try {
      const response = await fetch('https://api.cromsennest.com/api/payment/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          orderDetails: orderDetails
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Backend Verification Failed:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
