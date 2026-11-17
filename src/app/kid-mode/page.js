'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { enterChildMode } from '@/lib/client/childMode';

/**
 * Select Child → Enter Child Mode (prototype flow "Who's listening tonight?").
 * Entering Child Mode replaces the parent session on this device with a restricted,
 * server-issued Child Mode session; the Parent Gate code is required to come back.
 * Layout uses V2 tokens; no Final Vision screen exists for this step (see docs).
 */
export default function KidModeSelect() {
  const router = useRouter();
  const { user } = useAuth();
  const { children = [], loading } = useFamily();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const start = async (childId) => {
    setBusyId(childId);
    setError('');
    try {
      await enterChildMode(childId);
      router.replace('/kid/dashboard');
    } catch (err) {
      setError(err.code === 'pin_required'
        ? 'Set a Parental Verification code in Settings first, so only you can leave Child Mode.'
        : (err.message || 'Could not start Child Mode.'));
      setBusyId(null);
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading profiles…" />;

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-[100dvh] w-full max-w-[430px] bg-dt-canvas px-5 pb-10 pt-12 text-dt-ink">
        <h1 className="text-[26px] font-bold leading-8">Who&apos;s listening tonight?</h1>
        <p className="mt-2 text-[16px] text-dt-muted">Choose a profile to enter Child Mode.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-dt bg-[#FDECEE] px-4 py-3 text-[15px] text-[#8C2633]">
            {error}{' '}
            {error.startsWith('Set a') && <a className="font-semibold underline" href="/settings#parent-gate">Open Settings</a>}
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {children.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => start(child.id)}
                disabled={Boolean(busyId)}
                className="flex min-h-[64px] w-full items-center gap-4 rounded-dt-card bg-white px-4 py-3 text-left shadow-dt-card disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet"
              >
                {child.photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={child.photoURL} alt="" className="h-12 w-12 rounded-full object-cover" />
                )}
                <span className="flex-1">
                  <span className="block text-[18px] font-bold">{child.name || child.displayName}</span>
                  {child.age ? <span className="block text-[14px] text-dt-muted">Age {child.age}</span> : null}
                </span>
                <span className="text-[15px] font-semibold text-dt-violet">{busyId === child.id ? 'Starting…' : 'Enter'}</span>
              </button>
            </li>
          ))}
        </ul>
        {!children.length && (
          <p className="mt-6 text-[16px] text-dt-muted">Add a child profile first in <a className="font-semibold text-dt-violet underline" href="/my-children">My Children</a>.</p>
        )}
        <p className="mt-8 text-[14px] text-dt-muted">Signed in as {user?.email}. Your parent session is protected while Child Mode is active.</p>
      </main>
    </ProtectedRoute>
  );
}
