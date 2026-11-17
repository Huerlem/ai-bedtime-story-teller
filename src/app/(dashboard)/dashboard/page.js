'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ParentDashboardView, { greetingFor } from '@/components/v2/ParentDashboardView';
import { getRecentStories } from '@/firebase/firestore';
import { normaliseStatus, STORY_STATUS } from '@/lib/storyStatus.mjs';

/** Parent Dashboard (Final Vision 50:14 screen 3). Parent accounts only. */
export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { children = [], loading: familyLoading } = useFamily();
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'parent') {
      router.replace(user?.childMode ? '/kid/dashboard' : '/login');
      return;
    }
    let cancelled = false;
    getRecentStories(user.uid, 10)
      .then((list) => { if (!cancelled) setStories(list); })
      .catch(() => { if (!cancelled) setStories([]); })
      .finally(() => { if (!cancelled) setStoriesLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, user, router]);

  const pendingReviews = useMemo(
    () => stories.filter((s) => normaliseStatus(s) === STORY_STATUS.REVIEW_REQUIRED).length,
    [stories],
  );

  if (authLoading || !user || user.role !== 'parent' || familyLoading || storiesLoading) {
    return <LoadingSpinner fullScreen message="Loading your family…" />;
  }

  const firstName = (user.displayName || '').trim().split(/\s+/)[0] || '';
  return (
    <ParentDashboardView
      firstName={firstName}
      greeting={greetingFor()}
      pendingReviews={pendingReviews}
      children={children}
      stories={stories}
      videoStudioAvailable={false}
    />
  );
}
