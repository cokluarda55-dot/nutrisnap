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

    if (!user) {
      return NextResponse.json(
        {
          error: 'AUTH_REQUIRED',
          message: 'Please sign in or create an account first so your VIP Pro membership is linked permanently.',
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // Activate Pro for this user in Supabase
    const { error: dbError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        is_pro: true,
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Error activating VIP code:', dbError);
      return NextResponse.json(
        { error: 'Database update failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '🎉 NutriSnap Pro VIP Membership activated! Enjoy unlimited AI scans.',
    });
  } catch (err: any) {
    console.error('Redeem code error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
