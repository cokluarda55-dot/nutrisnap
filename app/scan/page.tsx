'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  Check,
  RefreshCw,
  Flame,
  Info,
  Layers,
  ThumbsUp,
  Edit3,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PaywallModal from '@/components/PaywallModal';
import { createClient } from '@/lib/supabase/client';
import { FoodAnalysisResult, MealType } from '@/lib/types';

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification & Correction states
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isEditingNumbers, setIsEditingNumbers] = useState(false);

  const supabase = createClient();

  // Resize and compress image using HTML5 Canvas (max 800px, 0.72 quality for sub-2s analysis)
  const processImageFile = (file: File) => {
    setErrorMessage(null);
    setAnalysisResult(null);
    setIsConfirmed(false);
    setShowCorrectionInput(false);
    setCorrectionText('');
    setIsEditingNumbers(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setImagePreview(compressedDataUrl);
          setImageMime('image/jpeg');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageMime,
        }),
      });

      const data = await response.json();

      if (response.status === 403 && data.error === 'PAYWALL_REQUIRED') {
        setShowPaywall(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze meal.');
      }

      setAnalysisResult(data.data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Recalculate with user's specific food correction
  const handleCorrectionSubmit = async () => {
    if (!imagePreview || !correctionText.trim()) return;
    setIsRecalculating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageMime,
          correction: correctionText.trim(),
          isCorrection: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate meal macros.');
      }

      setAnalysisResult(data.data);
      setShowCorrectionInput(false);
      setIsConfirmed(true);

      // Teach AI this correction so future scans recognize it accurately
      fetch('/api/learn-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_name: data.data.food_name,
          original_guess: analysisResult?.food_name || null,
          calories: data.data.calories,
          protein: data.data.protein,
          carbs: data.data.carbs,
          fat: data.data.fat,
          is_verified: true,
          was_corrected: true,
          user_notes: `User corrected from "${analysisResult?.food_name}" to "${correctionText.trim()}".`,
        }),
      }).catch(() => {});
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error updating analysis. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleConfirmMeal = () => {
    setIsConfirmed(true);
    if (!analysisResult) return;
    // Record positive feedback in AI memory
    fetch('/api/learn-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: analysisResult.food_name,
        original_guess: analysisResult.food_name,
        calories: analysisResult.calories,
        protein: analysisResult.protein,
        carbs: analysisResult.carbs,
        fat: analysisResult.fat,
        is_verified: true,
        was_corrected: false,
        user_notes: 'User verified meal accuracy as correct.',
      }),
    }).catch(() => {});
  };

  const handleSaveMeal = async () => {
    if (!analysisResult) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newMeal = {
        meal_name: analysisResult.food_name,
        calories: Number(analysisResult.calories),
        protein: Number(analysisResult.protein),
        carbs: Number(analysisResult.carbs),
        fat: Number(analysisResult.fat),
        meal_type: selectedMealType,
        notes: analysisResult.health_tip,
        consumed_at: new Date().toISOString(),
      };

      if (user) {
        await supabase.from('meals').insert({
          ...newMeal,
          user_id: user.id,
        });
      } else {
        // Save in guest localStorage
        const existing = JSON.parse(localStorage.getItem('nutrisnap_guest_meals') || '[]');
        const guestMeal = {
          id: 'guest_' + Date.now(),
          user_id: 'guest',
          ...newMeal,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(
          'nutrisnap_guest_meals',
          JSON.stringify([guestMeal, ...existing])
        );

        const currentGuestCount = parseInt(
          localStorage.getItem('nutrisnap_guest_count') || '0',
          10
        );
        localStorage.setItem(
          'nutrisnap_guest_count',
          (currentGuestCount + 1).toString()
        );
      }

      // If user calibrated macros manually, teach AI
      if (isEditingNumbers) {
        fetch('/api/learn-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            food_name: analysisResult.food_name,
            original_guess: analysisResult.food_name,
            calories: Number(analysisResult.calories),
            protein: Number(analysisResult.protein),
            carbs: Number(analysisResult.carbs),
            fat: Number(analysisResult.fat),
            is_verified: true,
            was_corrected: true,
            user_notes: 'User manually calibrated nutrition numbers.',
          }),
        }).catch(() => {});
      }

      // Trigger Confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#06b6d4', '#f59e0b'],
      });

      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err) {
      console.error('Failed to log meal:', err);
      setErrorMessage('Could not log meal to daily diary.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetPhoto = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setIsConfirmed(false);
    setShowCorrectionInput(false);
    setCorrectionText('');
    setIsEditingNumbers(false);
  };

  return (
    <div className="flex-1 flex flex-col p-4 pt-safe pb-28">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-slate-400 hover:text-white rounded-2xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-base text-slate-200">AI Meal Analysis</h2>
        <div className="w-9" />
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main View: Camera viewfinder or Upload Preview */}
      {!imagePreview ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-full aspect-square max-w-sm mx-auto rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            {/* Viewfinder crosshairs */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500/60 rounded-tl" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500/60 rounded-tr" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500/60 rounded-bl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500/60 rounded-br" />

            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <Camera className="w-10 h-10" />
            </div>

            <h3 className="font-bold text-base text-slate-200 mb-1">
              Snap a Photo of Your Food
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              NutriAI recognizes items on your plate, estimating portion sizes and macros automatically.
            </p>

            {/* Action Buttons */}
            <div className="w-full space-y-3">
              {/* Native Camera input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </button>

              {/* Gallery upload input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleCameraChange}
                className="hidden"
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-700/60 transition"
              >
                <ImageIcon className="w-4 h-4" />
                Choose from Gallery
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Image Preview Box */}
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Meal Preview"
              className="w-full h-full object-cover"
            />

            {!analysisResult && (
              <button
                onClick={resetPhoto}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Trigger or AI Result */}
          {!analysisResult ? (
            <div className="flex flex-col items-center pt-2">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>NutriAI is Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Start AI Analysis</span>
                  </>
                )}
              </button>
              {isAnalyzing && (
                <p className="text-xs text-slate-400 mt-3 text-center animate-pulse">
                  Scanning your plate, estimating portions and calculating macros...
                </p>
              )}
            </div>
          ) : (
            /* Analysis Result Card */
            <div className="space-y-3.5 animate-fade-in">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
                {/* Title & Calories */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      Identified Meal
                    </span>
                    {isEditingNumbers ? (
                      <input
                        type="text"
                        value={analysisResult.food_name}
                        onChange={(e) =>
                          setAnalysisResult({ ...analysisResult, food_name: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-sm font-bold text-white mt-0.5"
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        {analysisResult.food_name}
                      </h3>
                    )}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-3 py-1.5 text-center shrink-0">
                    <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-base">
                      <Flame className="w-4 h-4" />
                      {isEditingNumbers ? (
                        <input
                          type="number"
                          value={analysisResult.calories}
                          onChange={(e) =>
                            setAnalysisResult({
                              ...analysisResult,
                              calories: Number(e.target.value),
                            })
                          }
                          className="w-16 bg-slate-950 text-center rounded-lg border border-slate-700 py-0.5 text-sm font-extrabold text-emerald-400"
                        />
                      ) : (
                        analysisResult.calories
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">kcal</span>
                  </div>
                </div>

                {/* Macro Pills */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 mb-3">
                  <div className="bg-slate-950/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400">Protein</span>
                    {isEditingNumbers ? (
                      <input
                        type="number"
                        value={analysisResult.protein}
                        onChange={(e) =>
                          setAnalysisResult({
                            ...analysisResult,
                            protein: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-blue-400 text-center py-1 mt-1"
                      />
                    ) : (
                      <p className="text-sm font-bold text-blue-400">{analysisResult.protein}g</p>
                    )}
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400">Carbs</span>
                    {isEditingNumbers ? (
                      <input
                        type="number"
                        value={analysisResult.carbs}
                        onChange={(e) =>
                          setAnalysisResult({
                            ...analysisResult,
                            carbs: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 text-center py-1 mt-1"
                      />
                    ) : (
                      <p className="text-sm font-bold text-amber-400">{analysisResult.carbs}g</p>
                    )}
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400">Fat</span>
                    {isEditingNumbers ? (
                      <input
                        type="number"
                        value={analysisResult.fat}
                        onChange={(e) =>
                          setAnalysisResult({
                            ...analysisResult,
                            fat: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-rose-400 text-center py-1 mt-1"
                      />
                    ) : (
                      <p className="text-sm font-bold text-rose-400">{analysisResult.fat}g</p>
                    )}
                  </div>
                </div>

                {/* Accuracy Feedback Check: "Did we get this right?" */}
                {!showCorrectionInput ? (
                  <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-3 mb-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {isConfirmed ? 'Meal Verified' : 'Did we get this right?'}
                      </span>
                      {isConfirmed && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Confirmed
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmMeal}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition ${
                          isConfirmed
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Yes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCorrectionInput(true);
                          setCorrectionText(analysisResult.food_name);
                        }}
                        className="py-2 px-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Not quite</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditingNumbers(!isEditingNumbers)}
                        className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition ${
                          isEditingNumbers
                            ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/30'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                        }`}
                        title="Edit numbers directly"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* User Correction Input Drawer */
                  <div className="bg-slate-950 border-2 border-amber-500/60 rounded-2xl p-3.5 mb-3 space-y-2.5 animate-fade-in shadow-xl shadow-amber-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Tell AI what this dish actually is:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCorrectionInput(false)}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Enter the correct dish name or ingredients. NutriAI will recalculate exact calories & macros:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Ezogelin soup with 1 slice whole wheat bread"
                        value={correctionText}
                        onChange={(e) => setCorrectionText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCorrectionSubmit}
                        disabled={isRecalculating || !correctionText.trim()}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {isRecalculating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Recalculate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Ingredients Breakdown */}
                {analysisResult.breakdown?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Ingredients & Portions Breakdown
                    </h5>
                    <div className="space-y-1.5">
                      {analysisResult.breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-950/40 text-slate-300"
                        >
                          <div>
                            <span className="font-medium text-slate-200">{item.item}</span>
                            <span className="text-slate-500 text-[11px] ml-1.5">({item.portion})</span>
                          </div>
                          <span className="font-semibold text-emerald-400">{item.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Dietitian Tip */}
                {analysisResult.health_tip && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{analysisResult.health_tip}</span>
                  </div>
                )}
              </div>

              {/* Meal Type Selection */}
              <div className="flex gap-2">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
                  const names: Record<MealType, string> = {
                    breakfast: 'Breakfast',
                    lunch: 'Lunch',
                    dinner: 'Dinner',
                    snack: 'Snack',
                  };
                  const isSelected = selectedMealType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMealType(type)}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {names[type]}
                    </button>
                  );
                })}
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={resetPhoto}
                  className="py-3 px-4 rounded-2xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Retake
                </button>
                <button
                  onClick={handleSaveMeal}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Log to Daily Diary'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
}
