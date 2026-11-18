import { NextRequest, NextResponse } from 'next/server';
import { getPolarClient } from '@/lib/polar';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const polar = getPolarClient();

    try {
      // Create a customer session for Polar's hosted customer portal
      const session = await polar.customerSessions.create({
        external_customer_id: user.id,
      });

      return NextResponse.json({ url: session.customer_portal_url });
    } catch (err: any) {
      console.warn('Customer session creation failed, redirecting to purchases portal fallback:', err);
      // Fallback to general Polar purchases portal
      return NextResponse.json({
        url: 'https://polar.sh/purchases/subscriptions',
      });
    }
  } catch (error: any) {
    console.error('Polar customer portal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to open customer portal.' },
      { status: 500 }
    );
  }
}
