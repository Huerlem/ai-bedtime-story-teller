'use client';

import { ChevronDown, ChevronLeft, LoaderCircle, Sparkles } from 'lucide-react';

/**
 * Create Story — Final Vision 50:14 screen 4 (phone). Measured on the 390 pt frame:
 * title row y≈105; Story/Video segmented control 337×55 pt at y=150; prompt field 337×100 pt
 * at y=267; Age range select 51 pt at y=430; Generate button 337×69 pt at y=750.
 * "Story style" (FV y=525–665) is NOT rendered: its four thumbnails exist only inside the
 * flattened Final Vision board (docs/ASSET_INVENTORY.md) — blocked pending original files.
 */
export const AGE_RANGES = ['3-5 years', '6-8 years', '9-12 years'];

export default function CreateStoryView({
  prompt, onPromptChange, age, onAgeChange, onGenerate, onBack, busy = false, error = '', videoAvailable = false,
}) {
  const canGenerate = prompt.trim().length >= 3 && !busy;
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-dt-canvas px-[25px] pb-[max(26px,env(safe-area-inset-bottom))] pt-[max(47px,env(safe-area-inset-top))] text-[#1F1D4A]">
      <div className="mt-[36px] flex items-center">
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-[11px] flex h-11 w-11 items-center justify-center text-[#1F1D4A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
          <ChevronLeft size={28} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <h1 className="ml-[17px] text-[21px] font-extrabold leading-7 text-[#1F1D4A]">Create a new story</h1>
      </div>

      <div role="tablist" aria-label="What to create" className="mt-[23px] grid h-[55px] grid-cols-2 rounded-[20px] bg-[#E4E1FA] p-[5px]">
        <button type="button" role="tab" aria-selected="true" className="rounded-[16px] bg-[#F3F1FF] text-[17px] font-bold text-dt-violet shadow-[0_2px_8px_rgba(80,70,180,0.12)]">Story</button>
        <button type="button" role="tab" aria-selected="false" disabled={!videoAvailable} title={videoAvailable ? undefined : 'Video Studio is not available yet'} className="rounded-[16px] text-[17px] font-bold text-[#1F1D4A] disabled:opacity-60">Video</button>
      </div>

      <label htmlFor="story-prompt" className="mt-[34px] block text-[17px] font-extrabold leading-6">What&apos;s the story about?</label>
      <textarea
        id="story-prompt"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        maxLength={1200}
        disabled={busy}
        placeholder="A friendly dragon who learns to be brave."
        className="mt-[6px] h-[100px] w-full resize-none rounded-[14px] border border-[#E6E3F5] bg-white px-[16px] py-[13px] text-[19px] font-semibold leading-[32px] text-[#2B2950] placeholder:text-[#9C99BC] focus:border-dt-violet focus:outline-none focus:ring-2 focus:ring-dt-violet/25"
      />

      <label htmlFor="age-range" className="mt-[26px] block text-[17px] font-extrabold leading-6">Age range</label>
      <div className="relative mt-[13px]">
        <select
          id="age-range"
          value={age}
          onChange={(e) => onAgeChange(e.target.value)}
          disabled={busy}
          className="h-[51px] w-full appearance-none bg-none rounded-[14px] border border-[#E6E3F5] bg-white pl-[18px] pr-12 text-[19px] font-semibold text-[#2B2950] focus:border-dt-violet focus:outline-none focus:ring-2 focus:ring-dt-violet/25"
        >
          {AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <ChevronDown size={22} strokeWidth={2.2} className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-[#6E6C8F]" aria-hidden="true" />
      </div>

      <p role="alert" aria-live="assertive" className="mt-4 min-h-[22px] text-[15px] text-[#A53149]">{error}</p>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="mt-auto flex h-[69px] w-full items-center justify-center gap-2 rounded-full bg-dt-primary text-[20px] font-bold text-white shadow-[0_8px_20px_rgba(115,100,246,0.35)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dt-violet"
      >
        {busy ? (
          <><LoaderCircle size={22} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Writing your story…</>
        ) : (
          <>Generate Story <Sparkles size={22} strokeWidth={2} className="text-[#FFE07A]" fill="#FFE07A" aria-hidden="true" /></>
        )}
      </button>
    </main>
  );
}
