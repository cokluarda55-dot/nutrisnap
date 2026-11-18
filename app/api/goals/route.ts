import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calories, protein, carbs, fat } = body;

    const calorieNum = Math.max(800, Math.min(8000, Number(calories) || 2000));
    const proteinNum = Math.max(10, Math.min(600, Number(protein) || 140));
    const carbsNum = Math.max(10, Math.min(800, Number(carbs) || 220));
    const fatNum = Math.max(10, Math.min(300, Number(fat) || 65));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const adminSupabase = createAdminClient();
      const { error } = await adminSupabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        daily_calorie_target: calorieNum,
        daily_protein_target: proteinNum,
        daily_carbs_target: carbsNum,
        daily_fat_target: fatNum,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to update goals in profiles table:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      goals: {
        calories: calorieNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      },
    });
  } catch (err: any) {
    console.error('API /api/goals error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error updating goals.' },
      { status: 500 }
    );
  }
}
