'use client';

import Link from 'next/link';
import { BookOpen, CirclePlus, House, UserRound, UsersRound } from 'lucide-react';

// Final Vision 50:14 screen 3 bottom navigation: Home · Library · Create · Children · Profile.
// Active tab: ink, filled glyph, bold label. Inactive: #9C99BC. Icons 26 pt, labels 12 pt.
const TABS = [
  { key: 'home', href: '/dashboard', label: 'Home', Icon: House },
  { key: 'library', href: '/my-stories', label: 'Library', Icon: BookOpen },
  { key: 'create', href: '/create-story', label: 'Create', Icon: CirclePlus },
  { key: 'children', href: '/my-children', label: 'Children', Icon: UsersRound },
  { key: 'profile', href: '/profile', label: 'Profile', Icon: UserRound },
];

export default function ParentTabBar({ active = 'home' }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-[#ECEAF7] bg-white/95 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ key, href, label, Icon }) => {
          const on = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-[3px] pt-2 text-[12px] ${on ? 'font-bold text-[#1F1D4A]' : 'font-semibold text-[#9C99BC]'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-dt-violet`}
              >
                <Icon size={26} strokeWidth={on ? 2.2 : 1.8} fill={on && key === 'home' ? 'currentColor' : 'none'} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
