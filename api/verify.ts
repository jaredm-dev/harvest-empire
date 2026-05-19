import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id, item } = req.query as Record<string, string>;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      res.json({ valid: true, itemId: item });
    } else {
      res.status(400).json({ valid: false, error: 'Payment not completed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
