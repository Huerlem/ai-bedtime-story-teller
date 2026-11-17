'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoonStar, X } from 'lucide-react';

/**
 * Contextual "Enter Child Mode" from My Children (product decision 17 Nov 2026).
 * No Figma design exists for this step: the sheet is built from Design System V2 tokens
 * (Dashboard avatar disc, Create Story primary button) and is PENDING VISUAL APPROVAL.
 * Entering Child Mode is server-authorised (/api/child-mode/enter) and requires a
 * Parental Verification code to have been set; leaving requires that code.
 */
export default function ChildActionSheet({ child, onClose, onEnterChildMode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const primaryRef = useRef(null);
  const name = child?.name || child?.displayName || 'your child';

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await onEnterChildMode(child.id);
    } catch (err) {
      setError(err?.code === 'pin_required' ? 'pin_required' : (err?.message || 'Could not start Child Mode.'));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden="true" onClick={() => !busy && onClose()} className="absolute inset-0 bg-[#1F1D4A]/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-sheet-title"
        className="relative w-full max-w-[430px] rounded-t-[28px] bg-white px-[25px] pb-[max(24px,env(safe-area-inset-bottom))] pt-[10px] text-[#1F1D4A] shadow-[0_-8px_30px_rgba(31,29,74,0.18)]"
      >
        <div className="mx-auto h-[5px] w-[36px] rounded-full bg-[#DAD7EE]" aria-hidden="true" />
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute right-[12px] top-[12px] flex h-11 w-11 items-center justify-center text-[#6E6C8F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
          <X size={24} strokeWidth={2.2} aria-hidden="true" />
        </button>

        <div className="mt-[18px] flex items-center gap-[16px]">
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E3DDFB] text-[28px] font-extrabold text-dt-violet">
            {child?.photoURL
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={child.photoURL} alt="" className="h-full w-full object-cover" />
              : <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>}
          </span>
          <div>
            <h2 id="child-sheet-title" className="text-[22px] font-extrabold leading-7 text-[#1F1D4A]">{name}</h2>
            {child?.age ? <p className="text-[15px] font-semibold leading-5 text-[#8D8BA8]">Age {child.age}</p> : null}
          </div>
        </div>

        <p className="mt-[18px] text-[16px] font-semibold leading-[23px] text-[#6E6C8F]">
          {name} will see only the stories you have approved. Your Parental Verification code is needed to leave Child Mode.
        </p>

        {error && (
          <p role="alert" className="mt-[14px] rounded-[14px] bg-[#FDECEE] px-4 py-3 text-[15px] font-semibold text-[#8C2633]">
            {error === 'pin_required'
              ? <>Set a Parental Verification code first, so only you can leave Child Mode. <Link href="/settings#parent-gate" className="underline">Open Settings</Link></>
              : error}
          </p>
        )}

        <button
          ref={primaryRef}
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-[22px] flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-dt-primary text-[19px] font-bold text-white shadow-[0_8px_20px_rgba(115,100,246,0.35)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dt-violet"
        >
          <MoonStar size={22} strokeWidth={2.2} aria-hidden="true" />
          {busy ? 'Starting Child Mode…' : 'Start Child Mode'}
        </button>
        <Link
          href={`/my-children?child=${encodeURIComponent(child?.id || '')}`}
          className="mt-[10px] flex h-[48px] w-full items-center justify-center text-[16px] font-bold text-dt-violet focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet"
        >
          Manage profile
        </Link>
      </div>
    </div>
  );
}
