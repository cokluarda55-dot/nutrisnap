import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// VIP and Beta Tester Promo Codes
const VALID_PROMO_CODES = [
  'VIP2026',
  'PROTEST',
  'NUTRIFRIEND',
  'BETA2026',
  'ARTECH',
];

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a VIP or Promo code.' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    if (!VALID_PROMO_CODES.includes(cleanCode)) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please check and try again.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const adminSupabase = createAdminClient();
      // Activate Pro permanently for this user in Supabase
      const { error: dbError } = await adminSupabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          is_pro: true,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Error activating VIP code in DB:', dbError);
      }
    }

    const response = NextResponse.json({
      success: true,
      is_pro: true,
      code: cleanCode,
      message: '🎉 NutriSnap Pro VIP Membership activated! Enjoy unlimited AI scans.',
    });

    // Set a long-lived cookie so server API and SSR routes immediately know this client is Pro
    response.cookies.set('nutrisnap_pro_vip', cleanCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    console.error('Redeem code error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
