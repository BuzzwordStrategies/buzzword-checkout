import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export async function handler(event) {
  // ─── CORS PRE-FLIGHT ─────────────────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',      // ← restrict to your domain in prod
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }
  // ─────────────────────────────────────────────────────────────────────────────

  try {
    const {
      bundleName     = 'Custom Bundle',
      subLength      = 3,
      selectedTiers  = {},   // e.g. { "SEO":"Standard", "Content":"Base" }
      finalMonthly   = 0
    } = JSON.parse(event.body || '{}');

    // missing/invalid price?
    if (!finalMonthly || finalMonthly <= 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Price missing' })
      };
    }

    // create a recurring Stripe Price object
    const price = await stripe.prices.create({
      unit_amount: Math.round(finalMonthly * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name:        bundleName,
        description: `${subLength}-month plan`,
        metadata:    { items: JSON.stringify(selectedTiers) }
      }
    });

    // create the Checkout session
    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: 'https://www.buzzwordstrategies.com/my-bundle?session={CHECKOUT_SESSION_ID}',
      cancel_url:  'https://www.buzzwordstrategies.com/build-my-bundle'
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
