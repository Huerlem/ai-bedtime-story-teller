'use client';

import Link from 'next/link';
import { Bell, Clapperboard, Feather, Plus } from 'lucide-react';
import ParentTabBar from './ParentTabBar';
import { STORY_SCENES } from '@/lib/brandAssets.mjs';

/**
 * Parent Dashboard — Final Vision 50:14 screen 3 (prototype 75:3 for behaviour).
 * Geometry measured on the 390 pt frame: greeting at y≈107; action tiles 162×122 pt with a
 * 16 pt gap and 25 pt margins; avatars 92 pt on a 121 pt pitch; story covers 135×95 pt with
 * 10 pt gaps; five-tab bar. Presentational only — data comes from the page container.
 */
export function coverFor(story) {
  // Generated story art (https) when available. Otherwise the approved premium scene whose
  // package README assigns it to "Parent Dashboard story cover" (decision pending, see docs).
  if (typeof story?.imageUrl === 'string' && /^https:\/\//.test(story.imageUrl)) {
    return { src: story.imageUrl, alt: '' };
  }
  return { src: STORY_SCENES.foxDiscoversStar.src, alt: '' };
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ParentDashboardView({
  firstName, greeting, pendingReviews = 0, children = [], stories = [], videoStudioAvailable = false,
}) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] bg-dt-canvas pb-[112px] pt-[max(47px,env(safe-area-inset-top))] text-[#1F1D4A]">
      <header className="flex items-start justify-between px-[25px] pt-[45px]">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[30px] tracking-[-0.2px] text-[#1F1D4A]">
            {greeting}{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mt-[13px] text-[16px] font-semibold leading-[22px] text-[#6E6C8F]">Let&apos;s create something amazing.</p>
        </div>
        <Link
          href="/my-stories?status=review_required"
          aria-label={pendingReviews ? `${pendingReviews} stories waiting for your review` : 'Notifications'}
          className="relative -mr-[9px] -mt-[2px] flex h-11 w-11 items-center justify-center text-[#1F1D4A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet"
        >
          <Bell size={26} strokeWidth={2} aria-hidden="true" />
          {pendingReviews > 0 && <span className="absolute right-[9px] top-[8px] h-[9px] w-[9px] rounded-full bg-[#EF4B5C] ring-2 ring-dt-canvas" aria-hidden="true" />}
        </Link>
      </header>

      <section aria-label="Create" className="mt-[30px] grid grid-cols-2 gap-[16px] px-[25px]">
        <Link href="/create-story" className="flex h-[122px] flex-col items-center justify-center rounded-[18px] bg-[#EDDEFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#D44DE8_0%,#9B3FE0_100%)] text-white shadow-[0_4px_10px_rgba(180,70,230,0.35)]" aria-hidden="true">
            <Feather size={24} strokeWidth={2.2} />
          </span>
          <span className="mt-[18px] text-[16px] font-bold leading-5">Create Story</span>
        </Link>
        {videoStudioAvailable ? (
          <Link href="/video-studio" className="flex h-[122px] flex-col items-center justify-center rounded-[18px] bg-dt-periwinkle focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
            <VideoGlyph />
            <span className="mt-[18px] text-[16px] font-bold leading-5">Create Video</span>
          </Link>
        ) : (
          <div aria-disabled="true" title="Video Studio is not available yet" className="flex h-[122px] flex-col items-center justify-center rounded-[18px] bg-dt-periwinkle opacity-60">
            <VideoGlyph />
            <span className="mt-[18px] text-[16px] font-bold leading-5">Create Video</span>
          </div>
        )}
      </section>

      <section aria-labelledby="children-heading" className="mt-[36px]">
        <h2 id="children-heading" className="px-[25px] text-[18px] font-extrabold leading-6 text-[#1F1D4A]">My Children</h2>
        <ul className="mt-[18px] flex overflow-x-auto px-[18px] [scrollbar-width:none]">
          {children.map((child) => (
            <li key={child.id} className="w-[121px] shrink-0">
              <Link href={`/my-children?child=${encodeURIComponent(child.id)}`} className="flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
                <span className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-[#E3DDFB] text-[34px] font-extrabold text-dt-violet">
                  {child.photoURL
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={child.photoURL} alt="" className="h-full w-full object-cover" />
                    : <span aria-hidden="true">{(child.name || child.displayName || '?').trim().charAt(0).toUpperCase()}</span>}
                </span>
                <span className="mt-[12px] text-[17px] font-extrabold leading-6">{child.name || child.displayName}</span>
                {child.age ? <span className="text-[15px] font-semibold leading-5 text-[#8D8BA8]">Age {child.age}</span> : null}
              </Link>
            </li>
          ))}
          <li className="w-[121px] shrink-0">
            <Link href="/my-children?add=1" className="flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
              <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#ECEAF8] text-[#1F1D4A]" aria-hidden="true">
                <Plus size={32} strokeWidth={2} />
              </span>
              <span className="mt-[12px] text-[17px] font-bold leading-6 text-[#8D8BA8]">Add child</span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="recent-heading" className="mt-[21px]">
        <div className="flex items-baseline justify-between px-[25px]">
          <h2 id="recent-heading" className="text-[18px] font-extrabold leading-6 text-[#1F1D4A]">Recent Stories</h2>
          <Link href="/my-stories" className="text-[16px] font-semibold text-[#6E6C8F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">See all</Link>
        </div>
        {stories.length === 0 ? (
          <p className="mt-[14px] px-[25px] text-[15px] text-[#6E6C8F]">Your stories will appear here.</p>
        ) : (
          <ul className="mt-[12px] flex gap-[10px] overflow-x-auto px-[25px] pb-2 [scrollbar-width:none]">
            {stories.map((story) => {
              const cover = coverFor(story);
              return (
                <li key={story.id} className="w-[135px] shrink-0">
                  <Link href={`/edit-story/${encodeURIComponent(story.id)}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.src} alt={cover.alt} width={135} height={95} className="h-[95px] w-[135px] rounded-[10px] object-cover" />
                    <span className="mt-[8px] line-clamp-2 text-[14px] font-bold leading-[21px] text-[#2B2950]">{story.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ParentTabBar active="home" />
    </div>
  );
}

function VideoGlyph() {
  return (
    <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#5FA3FF_0%,#3E6CF2_100%)] text-white shadow-[0_4px_10px_rgba(70,120,240,0.35)]" aria-hidden="true">
      <Clapperboard size={23} strokeWidth={2.2} />
    </span>
  );
}
