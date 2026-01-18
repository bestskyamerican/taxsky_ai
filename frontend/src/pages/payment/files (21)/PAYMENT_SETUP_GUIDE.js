// ============================================================
// PAYMENT SETUP GUIDE - TaxSky
// ============================================================

/*
STEP 1: Create Stripe Account
=============================
1. Go to https://stripe.com
2. Sign up for a free account
3. Get your API keys from Dashboard → Developers → API Keys

You'll need:
- STRIPE_SECRET_KEY (starts with sk_test_ or sk_live_)
- STRIPE_PUBLIC_KEY (starts with pk_test_ or pk_live_)
- STRIPE_WEBHOOK_SECRET (create webhook first)
*/


/*
STEP 2: Add Environment Variables
=================================

In backend/.env add:
-------------------
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

In frontend/.env add:
--------------------
VITE_STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
*/


/*
STEP 3: Install Dependencies
============================

Backend:
--------
cd C:\ai_tax\backend
npm install stripe

Frontend:
---------
cd C:\ai_tax\frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
*/


/*
STEP 4: Update server.js
========================

Add these lines to your server.js:
*/

// Add import at top:
import paymentRoutes from './routes/paymentRoutes.js';

// Add BEFORE other routes (webhook needs raw body):
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Add with other routes:
app.use('/api/payments', paymentRoutes);


/*
STEP 5: Update App.jsx (Frontend Routes)
========================================

Add these imports:
*/
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';

// Add routes inside <Routes>:
// <Route path="/pricing" element={<PricingPage />} />
// <Route path="/checkout/:planId" element={<CheckoutPage />} />


/*
STEP 6: File Locations
======================

Backend:
--------
C:\ai_tax\backend\models\Payment.js
C:\ai_tax\backend\controllers\paymentController.js
C:\ai_tax\backend\routes\paymentRoutes.js

Frontend:
---------
C:\ai_tax\frontend\src\pages\PricingPage.jsx
C:\ai_tax\frontend\src\pages\CheckoutPage.jsx
*/


/*
STEP 7: Test Cards (Stripe Test Mode)
=====================================

Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

Any future date, any 3-digit CVC, any ZIP
*/


/*
STEP 8: Create Stripe Webhook (Optional but recommended)
========================================================

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://yourdomain.com/api/payments/webhook
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
4. Copy the webhook secret to STRIPE_WEBHOOK_SECRET
*/


/*
API ENDPOINTS
=============

GET  /api/payments/pricing           - Get all plans
POST /api/payments/create-intent     - Create payment intent
POST /api/payments/confirm           - Confirm payment
POST /api/payments/webhook           - Stripe webhook
GET  /api/payments/user/:userId      - Get user's payments
GET  /api/payments/access/:userId    - Check user's access
POST /api/payments/refund            - Request refund
GET  /api/payments/admin/all         - Admin: all payments
*/


/*
PRICING STRUCTURE
=================

Basic:     FREE    - Federal only, single W-2
Standard:  $29.99  - State included, multiple W-2s, 1099
Premium:   $49.99  - Self-employed, CPA review, audit protection

Add-ons:
- Additional State: $14.99
- Audit Protection: $19.99
*/

export {};
