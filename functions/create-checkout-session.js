import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export async function handler(event) {
  try {
    const {
      bundleName = 'Custom Bundle',
      subLength = 3,
      selectedTiers = {}, // Example: { "SEO":"Plus", "Content":"Base" }
      finalMonthly = 0
    } = JSON.parse(event.body || '{}');

    if (!finalMonthly || finalMonthly <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Price missing' })
      };
    }

    const price = await stripe.prices.create({
      unit_amount: Math.round(finalMonthly * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: bundleName,
        description: `${subLength}‑month plan`,
        metadata: { items: JSON.stringify(selectedTiers) }
      }
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: 'https://www.buzzwordstrategies.com/my-bundle?session={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.buzzwordstrategies.com/build-my-bundle'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}
