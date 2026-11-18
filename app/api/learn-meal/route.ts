import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordMealFeedback } from '@/lib/learning';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      food_name,
      original_guess,
      calories,
      protein,
      carbs,
      fat,
      is_verified,
      was_corrected,
      user_notes,
    } = body;

    if (!food_name) {
      return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await recordMealFeedback({
      user_id: user?.id || null,
      food_name,
      original_guess,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      is_verified: is_verified !== false,
      was_corrected: !!was_corrected,
      user_notes: user_notes || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Meal feedback saved to AI learning memory!',
    });
  } catch (err: any) {
    console.error('Error in /api/learn-meal:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
