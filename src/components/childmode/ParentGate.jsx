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

  // Geometry measured from Final Vision 50:14 screen 7 (208 px → 390 pt, 17 Nov 2026):
  // keys 110×68 pt, 7 pt gaps, 23 pt margins; code boxes 64×68 pt, 10 pt gaps; lock disc
  // 110 pt centred at y=165; title centred at y=250; keypad y=460–750; footer at the bottom.
  // Short screens (≤700 pt tall, e.g. iPhone SE) use a proportionally compacted variant.
  const key = 'flex h-[68px] [@media(max-height:700px)]:h-[52px] flex-col items-center justify-center rounded-[12px] border border-white/[0.06] bg-[#232A55] text-white transition active:bg-[#2E3666] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold';
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-dt-night px-[23px] pb-[max(34px,env(safe-area-inset-bottom))] [@media(max-height:700px)]:pb-[max(8px,env(safe-area-inset-bottom))] pt-[max(47px,env(safe-area-inset-top))] text-white">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to my stories"
        className="-ml-[5px] mt-[35px] [@media(max-height:700px)]:mt-[4px] flex h-11 w-11 items-center justify-center rounded-full text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-gold"
      >
        <ChevronLeft size={28} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <div className="mx-auto -mt-[16px] flex h-[110px] w-[110px] [@media(max-height:700px)]:h-[72px] [@media(max-height:700px)]:w-[72px] items-center justify-center rounded-full bg-[#27315F] shadow-[0_0_36px_rgba(115,100,246,0.28)]">
        <LockKeyhole size={58} strokeWidth={1.75} className="[@media(max-height:700px)]:h-10 [@media(max-height:700px)]:w-10" aria-hidden="true" />
      </div>

      <h1 className="mt-[14px] [@media(max-height:700px)]:mt-[10px] text-center text-[25px] font-bold leading-8">Parental Verification</h1>
      <p className="mt-[10px] [@media(max-height:700px)]:mt-1 text-center text-[19px] leading-[33px] [@media(max-height:700px)]:leading-[26px] text-white/85">
        Please enter the code<br />to access the parent area
      </p>

      <div className="mt-[22px] [@media(max-height:700px)]:mt-3 flex justify-center gap-[10px]" role="group" aria-label={`Code entry, ${digits.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < digits.length;
          const current = i === digits.length && !busy;
          return (
            <div
              key={i}
              className={`flex h-[68px] w-[64px] [@media(max-height:700px)]:h-[54px] [@media(max-height:700px)]:w-[52px] items-center justify-center rounded-[12px] border ${current || filled ? 'border-white/55' : 'border-white/25'} bg-white/[0.05]`}
              aria-hidden="true"
            >
              <span className={filled
                ? 'h-[20px] w-[20px] rounded-full bg-[#ECE9FF] shadow-[0_0_14px_4px_rgba(154,121,248,0.85)]'
                : 'h-[11px] w-[11px] rounded-full bg-white/85'} />
            </div>
          );
        })}
      </div>

      <p role="alert" aria-live="assertive" className="mt-[4px] min-h-[22px] text-center text-[15px] leading-[22px] text-[#FFB4BA]">
        {error}
      </p>

      <div className="mt-[3px] grid grid-cols-3 gap-[7px]" aria-label="Number pad">
        {KEYS.map(([d, letters]) => (
          <button key={d} type="button" disabled={busy || locked} onClick={() => press(d)} aria-label={d} className={key}>
            <span className="text-[25px] font-semibold leading-7">{d}</span>
            <span className="h-[10px] text-[7px] font-semibold uppercase leading-[10px] tracking-[0.6px] text-white/60" aria-hidden="true">{letters}</span>
          </button>
        ))}
        {/* Product decision 17 Nov 2026: no "." key — the position stays empty. */}
        <div aria-hidden="true" />
        <button type="button" disabled={busy || locked} onClick={() => press('0')} aria-label="0" className={key}>
          <span className="text-[25px] font-semibold leading-7">0</span>
        </button>
        <button type="button" disabled={busy || digits.length === 0} onClick={erase} aria-label="Delete last digit" className={key}>
          <Delete size={28} strokeWidth={1.8} aria-hidden="true" />
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
