'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Delete, LockKeyhole } from 'lucide-react';

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
];

/**
 * Parental Verification — Final Vision 50:14 screen 7 (prototype 105:18–105:267).
 * Presentational only: the code is verified by /api/child-mode/exit, never in the client.
 *
 * Props: onSubmit(pin) → Promise<void> (throws Error with .message on failure), onBack(),
 * onForgot(), status: { error?: string, locked?: boolean }.
 */
export default function ParentGate({ onSubmit, onBack, onForgot }) {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);

  const submit = useCallback(async (pin) => {
    setBusy(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(err?.message || 'That code is not correct. Try again.');
      setLocked(err?.code === 'locked' || err?.status === 429);
      setDigits('');
    } finally {
      setBusy(false);
    }
  }, [onSubmit]);

  const press = useCallback((d) => {
    if (busy || locked || digits.length >= 4) return;
    setError('');
    const next = digits + d;
    setDigits(next);
    // Submit outside the state updater so StrictMode cannot send the code twice.
    if (next.length === 4) submit(next);
  }, [busy, locked, digits, submit]);

  const erase = useCallback(() => { if (!busy) setDigits((c) => c.slice(0, -1)); }, [busy]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, erase]);

  return (
    <main className="dt-gate relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-dt-night px-[6px] pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(47px,env(safe-area-inset-top))] text-white">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to my stories"
        className="ml-[6px] mt-[16px] flex h-11 w-11 [@media(max-height:700px)]:mt-1 items-center justify-center rounded-full text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
      >
        <ChevronLeft size={28} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="mx-auto -mt-3 flex h-[106px] w-[106px] [@media(max-height:700px)]:h-[72px] [@media(max-height:700px)]:w-[72px] items-center justify-center rounded-full bg-[#27315F] shadow-[0_0_36px_rgba(115,100,246,0.28)]">
        <LockKeyhole size={56} strokeWidth={2.4} aria-hidden="true" />
      </div>

      <h1 className="mt-[22px] [@media(max-height:700px)]:mt-3 text-center text-[25px] font-bold leading-8 tracking-[-0.2px]">Parental Verification</h1>
      <p className="mt-2 text-center text-[19px] leading-[34px] text-white/85">
        Please enter the code<br />to access the parent area
      </p>

      <div className="mt-4 flex justify-center gap-[12px]" role="group" aria-label={`Code entry, ${digits.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < digits.length;
          const current = i === digits.length && !busy;
          return (
            <div
              key={i}
              className={`flex h-[74px] w-[72px] [@media(max-height:700px)]:h-[56px] [@media(max-height:700px)]:w-[56px] items-center justify-center rounded-[14px] border ${current ? 'border-white/60 shadow-[0_0_12px_rgba(154,121,248,0.45)]' : 'border-white/25'} bg-white/[0.05]`}
              aria-hidden="true"
            >
              <span className={filled
                ? 'h-[22px] w-[22px] rounded-full bg-[#E9E6FF] shadow-[0_0_14px_4px_rgba(154,121,248,0.85)]'
                : 'h-[11px] w-[11px] rounded-full bg-white/80'} />
            </div>
          );
        })}
      </div>

      <p role="alert" aria-live="assertive" className="mt-1 min-h-[22px] text-center text-[15px] text-[#FFB4BA]">
        {error}
      </p>

      <div className="mt-1 grid grid-cols-3 gap-[8px]" aria-label="Number pad">
        {KEYS.map(([d, letters]) => (
          <button
            key={d}
            type="button"
            disabled={busy || locked}
            onClick={() => press(d)}
            aria-label={d}
            className="flex h-[64px] [@media(max-height:700px)]:h-[50px] flex-col items-center justify-center rounded-[14px] border border-white/[0.06] bg-[#232A55] text-white transition active:bg-[#2E3666] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
          >
            <span className="text-[24px] font-semibold leading-7">{d}</span>
            <span className="h-[10px] text-[7px] font-semibold uppercase leading-[10px] tracking-[0.6px] text-white/60" aria-hidden="true">{letters}</span>
          </button>
        ))}
        {/* Final Vision shows "." in this position; it has no function in a numeric code
            and is rendered as an inert key (see docs/DESIGN_TOKENS.md conflicts). */}
        <div className="flex h-[64px] [@media(max-height:700px)]:h-[50px] items-center justify-center rounded-[14px] border border-white/[0.06] bg-[#232A55] text-[24px] text-white/80" aria-hidden="true">.</div>
        <button
          type="button"
          disabled={busy || locked}
          onClick={() => press('0')}
          aria-label="0"
          className="flex h-[64px] [@media(max-height:700px)]:h-[50px] items-center justify-center rounded-[14px] border border-white/[0.06] bg-[#232A55] text-[24px] font-semibold text-white active:bg-[#2E3666] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
        >
          0
        </button>
        <button
          type="button"
          disabled={busy || digits.length === 0}
          onClick={erase}
          aria-label="Delete last digit"
          className="flex h-[64px] [@media(max-height:700px)]:h-[50px] items-center justify-center rounded-[14px] border border-white/[0.06] bg-[#232A55] text-white active:bg-[#2E3666] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
        >
          <Delete size={26} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onForgot}
        className="mx-auto mt-auto min-h-[44px] px-4 pt-3 text-[17px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
      >
        Forgot code?
      </button>
    </main>
  );
}
