'use client';

import { useState } from 'react';
import { approveStory, withdrawStory, confirmParentPassword, ReauthRequiredError } from '@/lib/client/storyApproval';
import { isChildVisible, normaliseStatus, STORY_STATUS } from '@/lib/storyStatus.mjs';

const STATUS_LABEL = {
  [STORY_STATUS.DRAFT]: 'Draft',
  [STORY_STATUS.GENERATING]: 'Generating',
  [STORY_STATUS.REVIEW_REQUIRED]: 'Waiting for your review',
  [STORY_STATUS.APPROVED]: 'Approved story',
};

/**
 * Parent review & approval control (Figma: Parent Preview & Approval → Approve & Publish,
 * Parental Verification). Approval always requires the parent to confirm their password;
 * the server rejects approvals without a fresh sign-in.
 *
 * NOTE: functional implementation only — final visual styling must follow the approved
 * Figma screens during the P2 UI migration.
 */
export default function StoryApprovalPanel({ storyId, story, hasUnsavedChanges = false, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  const visible = isChildVisible(story);
  const status = normaliseStatus(story);

  const runApproval = async () => {
    setBusy(true);
    setError(null);
    try {
      await approveStory(storyId);
      setNeedsPassword(false);
      setPassword('');
      onChange?.({ status: STORY_STATUS.APPROVED, isPublished: true });
    } catch (err) {
      if (err instanceof ReauthRequiredError) setNeedsPassword(true);
      else setError(err.message || 'Approval failed');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await confirmParentPassword(password);
    } catch {
      setBusy(false);
      setError('That password did not match. Please try again.');
      return;
    }
    setPassword('');
    await runApproval();
  };

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      await withdrawStory(storyId);
      onChange?.({ status: STORY_STATUS.REVIEW_REQUIRED, isPublished: false });
    } catch (err) {
      setError(err.message || 'Could not withdraw the story');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="approval-heading" className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <h2 id="approval-heading" className="text-base font-bold text-[#29264C]">Parent approval</h2>
      <p className="mt-1 text-sm text-[#29264C]" role="status">
        {visible ? 'Visible in Child Mode.' : 'Not visible to children.'} Status: {STATUS_LABEL[status] || status}
      </p>

      {hasUnsavedChanges && (
        <p className="mt-2 text-sm text-amber-800">Save your changes before approving. Editing an approved story sends it back for review.</p>
      )}

      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}

      {needsPassword && !visible && (
        <form onSubmit={submitPassword} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm text-[#29264C]">
            Confirm your password to approve
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full min-h-[44px] rounded-xl border border-violet-300 px-3"
              required
            />
          </label>
          <button type="submit" disabled={busy} className="min-h-[44px] rounded-xl bg-[#7665C2] px-4 font-semibold text-white disabled:opacity-60">
            {busy ? 'Checking…' : 'Confirm'}
          </button>
          <button type="button" disabled={busy} onClick={() => { setNeedsPassword(false); setPassword(''); setError(null); }} className="min-h-[44px] rounded-xl px-4 text-[#29264C]">
            Cancel
          </button>
        </form>
      )}

      {!needsPassword && (
        <div className="mt-3 flex gap-2">
          {!visible ? (
            <button type="button" onClick={runApproval} disabled={busy || hasUnsavedChanges} className="min-h-[44px] rounded-xl bg-[#7665C2] px-4 font-semibold text-white disabled:opacity-60">
              {busy ? 'Approving…' : 'Approve & Publish'}
            </button>
          ) : (
            <button type="button" onClick={withdraw} disabled={busy} className="min-h-[44px] rounded-xl border border-[#7665C2] px-4 font-semibold text-[#7665C2] disabled:opacity-60">
              {busy ? 'Withdrawing…' : 'Withdraw from Child Mode'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
