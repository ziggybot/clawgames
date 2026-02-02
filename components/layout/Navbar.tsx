'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'GAMES', href: '/games' },
  { label: 'LEADERBOARD', href: '/leaderboard' },
  { label: 'BOTS', href: '/bots' },
  { label: 'ABOUT', href: '/about' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="w-full max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-terminal font-bold text-base sm:text-lg tracking-wider text-glow hover:text-terminal-bright transition-colors shrink-0"
        >
          {'>'} CLAWGAMES
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs tracking-wide transition-colors rounded whitespace-nowrap ${
                  isActive
                    ? 'text-terminal bg-terminal/10 text-glow'
                    : 'text-text-secondary hover:text-terminal hover:bg-terminal/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
