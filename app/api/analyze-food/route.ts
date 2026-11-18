import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodImage } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType, correction, isCorrection } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Please upload or snap a photo to analyze.' },
        { status: 400 }
      );
    }

    // 1. Supabase User & Quota Verification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isPro = false;
    let analysesCount = 0;
    const adminSupabase = createAdminClient();

    if (user) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('analyses_count, is_pro')
        .eq('id', user.id)
        .single();

      if (profile) {
        isPro = profile.is_pro;
        analysesCount = profile.analyses_count;
      } else {
        // Auto-create profile row so it immediately shows up in Supabase Table Editor
        await adminSupabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          is_pro: false,
          analyses_count: 0,
        });
      }

      // Check quota only for initial new scans, not when refining/correcting the current dish
      if (!isCorrection && analysesCount >= 3 && !isPro) {
        return NextResponse.json(
          {
            error: 'PAYWALL_REQUIRED',
            message: 'You have completed your 3 free meal scans. Upgrade to NutriSnap Pro for unlimited AI scans.',
            analyses_count: analysesCount,
            is_pro: false,
          },
          { status: 403 }
        );
      }
    }

    // 2. Multimodal AI Analysis with Gemini (with optional user correction hint)
    const analysisResult = await analyzeFoodImage(
      image,
      mimeType || 'image/jpeg',
      correction || undefined
    );

    // 3. Increment counter only on fresh new analyses
    if (user && !isCorrection) {
      await adminSupabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          analyses_count: analysesCount + 1,
          is_pro: isPro,
          updated_at: new Date().toISOString(),
        });

      analysesCount += 1;
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
      usage: {
        analyses_count: analysesCount,
        is_pro: isPro,
        remaining_free: isPro ? 'unlimited' : Math.max(0, 3 - analysesCount),
      },
    });
  } catch (error: any) {
    console.error('Meal analysis API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze meal photo.' },
      { status: 500 }
    );
  }
}
