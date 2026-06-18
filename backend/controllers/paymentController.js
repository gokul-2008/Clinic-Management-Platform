import Stripe from 'stripe';
import Billing from '../models/Billing.js';

// Init Stripe. Fallback to placeholder key to prevent crash on boot if env is not configured.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_placeholder');

// Create checkout session
export const createCheckoutSession = async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await Billing.findById(billId).populate('patientId');
    if (!bill) {
      return res.status(404).json({ message: 'Billing invoice not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Graceful fallback for mock testing
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
      console.log('Stripe key is empty or placeholder. Generating local mock payment redirect...');
      const mockCheckoutUrl = `${frontendUrl}/patient-dashboard?checkout_session=mock_session_id&bill_id=${billId}`;
      return res.status(200).json({ url: mockCheckoutUrl });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CarePulse Clinic - Medical Services`,
              description: bill.services || 'General Consultation'
            },
            unit_amount: Math.round(bill.totalAmount * 100) // Stripe unit amount must be integer cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/patient-dashboard?checkout_session={CHECKOUT_SESSION_ID}&bill_id=${billId}`,
      cancel_url: `${frontendUrl}/patient-dashboard?payment_failed=true`
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Confirm payment session success
export const confirmPayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await Billing.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    bill.paymentStatus = 'Paid';
    const updated = await bill.save();

    res.status(200).json({ message: 'Payment confirmed successfully', bill: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
