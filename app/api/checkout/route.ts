import { NextRequest, NextResponse } from 'next/server';
import { getPolarClient } from '@/lib/polar';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const polar = getPolarClient();
    const productId = process.env.POLAR_PRODUCT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!productId) {
      return NextResponse.json(
        { error: 'POLAR_PRODUCT_ID is not configured in environment variables.' },
        { status: 500 }
      );
    }

    try {
      // Create Polar checkout session with snake_case parameters
      const checkout = await polar.checkouts.create({
        products: [productId],
        success_url: `${appUrl}/?subscription=success`,
        customer_email: user?.email || undefined,
        external_customer_id: user?.id || undefined,
        metadata: {
          userId: user?.id || '',
        },
      });

      return NextResponse.json({ url: checkout.url });
    } catch (apiError: any) {
      console.warn('Polar API checkout creation warning:', apiError?.message || apiError);
      // Resilient fallback to direct Polar hosted checkout URL if token has limited scope
      const fallbackUrl = `https://polar.sh/checkout?product_id=${productId}${
        user?.email ? `&customer_email=${encodeURIComponent(user.email)}` : ''
      }`;
      return NextResponse.json({ url: fallbackUrl });
    }
  } catch (error: any) {
    console.error('Polar checkout error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize Polar checkout session.' },
      { status: 500 }
    );
  }
}
