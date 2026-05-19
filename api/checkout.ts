import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const ITEMS: Record<string, { name: string; price: number }> = {
  starter_pack:  { name: 'Starter Pack',  price: 199  },
  growth_pack:   { name: 'Growth Pack',   price: 499  },
  business_pack: { name: 'Business Pack', price: 999  },
  tycoon_pack:   { name: 'Tycoon Pack',   price: 1999 },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { itemId, returnUrl } = req.body ?? {};
  const item = ITEMS[itemId as string];
  if (!item) return res.status(400).json({ error: 'Invalid item' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Harvest Empire — ${item.name}` },
          unit_amount: item.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${returnUrl}?purchase_success={CHECKOUT_SESSION_ID}&item=${itemId}`,
      cancel_url: `${returnUrl}?purchase_cancelled=true`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
