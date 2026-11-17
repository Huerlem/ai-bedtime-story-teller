'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { secureFetch } from '@/lib/client/secureFetch';
import { confirmParentPassword } from '@/lib/client/storyApproval';
import { getParentPinStatus, setParentPin } from '@/lib/client/childMode';

/**
 * Parent-only controls: Parental Verification code, data export and account deletion.
 * Each privileged action asks for the account password (server requires a password
 * sign-in in the last 5 minutes). Functional V2 styling; no Final Vision screen exists
 * for Settings — to be reviewed against Figma when designed.
 */
export default function PrivacyAndSafetyPanel() {
  const router = useRouter();
  const [hasPin, setHasPin] = useState(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { getParentPinStatus().then((r) => setHasPin(r.hasPin)).catch(() => setHasPin(null)); }, []);

  const run = async (key, fn) => {
    setBusy(key);
    setMessage({ type: '', text: '' });
    try { await fn(); } catch (err) { setMessage({ type: 'error', text: err.message || 'Something went wrong' }); } finally { setBusy(''); }
  };
  const requirePassword = () => { if (!password) throw new Error('Enter your account password to continue'); };

  const savePin = () => run('pin', async () => {
    if (pin !== pin2) throw new Error('The two codes do not match');
    requirePassword();
    await confirmParentPassword(password);
    await setParentPin(pin);
    setHasPin(true); setPin(''); setPin2(''); setPassword('');
    setMessage({ type: 'ok', text: 'Parental Verification code saved.' });
  });

  const exportData = () => run('export', async () => {
    requirePassword();
    await confirmParentPassword(password);
    const response = await secureFetch('/api/account/export');
    if (!response.ok) throw new Error('Export failed');
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `dream-tales-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setPassword('');
    setMessage({ type: 'ok', text: 'Your data export has been downloaded.' });
  });

  const deleteAccount = () => run('delete', async () => {
    if (confirmText !== 'DELETE') throw new Error('Type DELETE to confirm');
    requirePassword();
    await confirmParentPassword(password);
    const response = await secureFetch('/api/account', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Deletion failed');
    await signOut(auth).catch(() => {});
    router.replace('/?account=deleted');
  });

  const field = 'mt-1 block min-h-[48px] w-full rounded-dt-sm border border-[#D9D5F2] bg-white px-3 text-[16px] text-dt-ink focus:border-dt-violet focus:outline-none focus:ring-2 focus:ring-dt-violet/30';
  const primary = 'min-h-[48px] rounded-dt bg-dt-primary px-5 font-bold text-white disabled:opacity-60';

  return (
    <section aria-labelledby="privacy-heading" className="mt-8 rounded-dt-lg bg-white p-6 text-dt-ink shadow-dt-card">
      <h2 id="privacy-heading" className="text-[22px] font-bold">Privacy &amp; safety</h2>
      {message.text && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-dt-sm px-3 py-2 text-[15px] ${message.type === 'error' ? 'bg-[#FDECEE] text-[#8C2633]' : 'bg-[#E6F5EE] text-[#1E5E46]'}`}>
          {message.text}
        </p>
      )}

      <label className="mt-4 block text-[15px] font-semibold">
        Account password (required for the actions below)
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      </label>

      <div id="parent-gate" className="mt-6 border-t border-[#EEEAF9] pt-5">
        <h3 className="text-[18px] font-bold">Parental Verification code</h3>
        <p className="mt-1 text-[15px] text-dt-muted">
          {hasPin ? 'A code is set. Enter a new one to change it.' : 'Set a 4-digit code. It is needed to leave Child Mode.'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-[15px] font-semibold">New code
            <input inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={field} />
          </label>
          <label className="text-[15px] font-semibold">Repeat code
            <input inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" type="password" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} className={field} />
          </label>
        </div>
        <button type="button" onClick={savePin} disabled={busy === 'pin' || pin.length !== 4} className={`mt-3 ${primary}`}>
          {busy === 'pin' ? 'Saving…' : 'Save code'}
        </button>
      </div>

      <div className="mt-6 border-t border-[#EEEAF9] pt-5">
        <h3 className="text-[18px] font-bold">Download your data</h3>
        <p className="mt-1 text-[15px] text-dt-muted">A copy of your account, child profiles and stories (JSON).</p>
        <button type="button" onClick={exportData} disabled={busy === 'export'} className="mt-3 min-h-[48px] rounded-dt border border-dt-violet px-5 font-bold text-dt-violet disabled:opacity-60">
          {busy === 'export' ? 'Preparing…' : 'Download my data'}
        </button>
      </div>

      <div className="mt-6 border-t border-[#EEEAF9] pt-5">
        <h3 className="text-[18px] font-bold text-[#8C2633]">Delete account</h3>
        <p className="mt-1 text-[15px] text-dt-muted">Permanently deletes your account, child profiles, stories, narration and images. This cannot be undone.</p>
        <label className="mt-3 block text-[15px] font-semibold">Type DELETE to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={field} autoComplete="off" />
        </label>
        <button type="button" onClick={deleteAccount} disabled={busy === 'delete' || confirmText !== 'DELETE'} className="mt-3 min-h-[48px] rounded-dt bg-[#A53149] px-5 font-bold text-white disabled:opacity-50">
          {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </section>
  );
}
