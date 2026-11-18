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

    // Build checkout payload dynamically, avoiding empty strings that trigger Polar 422
    const checkoutPayload: any = {
      products: [productId],
      success_url: `${appUrl}/?subscription=success`,
    };

    if (user?.email) {
      checkoutPayload.customer_email = user.email;
    }

    if (user?.id) {
      checkoutPayload.external_customer_id = user.id;
      checkoutPayload.metadata = {
        userId: user.id,
      };
    }

    const checkout = await polar.checkouts.create(checkoutPayload);

    if (!checkout || !checkout.url) {
      throw new Error('Polar did not return a valid checkout URL.');
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error('Polar checkout creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize Polar checkout session.' },
      { status: 500 }
    );
  }
}
