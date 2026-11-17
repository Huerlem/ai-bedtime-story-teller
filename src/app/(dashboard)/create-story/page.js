'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CreateStoryView, { AGE_RANGES } from '@/components/v2/CreateStoryView';
import useAIStoryGeneration from '@/hooks/useAIStoryGeneration';
import { createStoryForChild } from '@/firebase/firestore';
import { STORY_STATUS } from '@/lib/storyStatus.mjs';
import { generateExcerpt } from '@/utils/helpers';

const fallbackTitle = (text) => text.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '');

/**
 * Create Story (Final Vision screen 4): prompt → AI story → title → saved as
 * review_required (never published) → Review & Approve. Parent accounts only.
 */
export default function CreateStoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { generateStory, generateTitle } = useAIStoryGeneration();
  const [prompt, setPrompt] = useState('');
  const [age, setAge] = useState(AGE_RANGES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'parent')) router.replace(user?.childMode ? '/kid/dashboard' : '/login');
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'parent') return <LoadingSpinner fullScreen message="Loading…" />;

  const onGenerate = async () => {
    setBusy(true);
    setError('');
    try {
      const content = await generateStory({ prompt: prompt.trim(), age, length: 'medium', mood: 'gentle' });
      let title = '';
      try { title = (await generateTitle(content)).replace(/^["'“]+|["'”]+$/g, '').trim(); } catch { /* best effort */ }
      const saved = await createStoryForChild({
        title: (title || fallbackTitle(content)).slice(0, 120),
        content,
        excerpt: generateExcerpt(content, 150),
        theme: prompt.trim(),
        age,
        length: 'medium',
        userId: user.uid,
        familyId: user.uid,
        status: STORY_STATUS.REVIEW_REQUIRED,
        isPublished: false,
        isFavorite: false,
        audioPath: null,
        imageUrl: null,
      });
      router.push(`/edit-story/${saved.id}?review=1`);
    } catch (err) {
      const msg = String(err?.message || '');
      setError(/429/.test(msg)
        ? 'You have reached today’s story limit. Please try again tomorrow.'
        : 'We couldn’t write the story just now. Your idea is still here — please try again.');
      setBusy(false);
    }
  };

  return (
    <CreateStoryView
      prompt={prompt}
      onPromptChange={setPrompt}
      age={age}
      onAgeChange={setAge}
      onGenerate={onGenerate}
      onBack={() => router.push('/dashboard')}
      busy={busy}
      error={error}
      videoAvailable={false}
    />
  );
}
