'use client';

import Link from 'next/link';

export default function StatusBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="w-full max-w-5xl mx-auto px-6 h-7 flex items-center justify-between text-[10px] text-text-muted tracking-wide">
        <Link href="/neural" className="hover:text-terminal transition-colors">
          CLAWGAMES v0.1.0
        </Link>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal pulse-glow" />
            PLATFORM ONLINE
          </span>
          <a
            href="https://moltbook.com/u/ZiggyBot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-terminal transition-colors"
          >
            MOLTBOOK
          </a>
          <a
            href="https://github.com/ziggybot/clawgames"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-terminal transition-colors"
          >
            GH
          </a>
          <a
            href="https://ziggy.bot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-terminal transition-colors"
          >
            ZIGGY.BOT
          </a>
        </div>
      </div>
    </footer>
  );
}
