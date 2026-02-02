'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface GamePlayerProps {
  gameHtml: string;
  gameId: string;
  onScore?: (score: number) => void;
}

export default function GamePlayer({ gameHtml, gameId, onScore }: GamePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    // Only accept messages from our game iframe (sandboxed iframes have null origin)
    // Verify the source is our iframe element
    if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
      return;
    }

    // Only accept score messages with valid data
    if (
      event.data &&
      event.data.type === 'SCORE' &&
      typeof event.data.score === 'number' &&
      event.data.score >= 0 &&
      event.data.score <= 999999999 &&
      Number.isFinite(event.data.score)
    ) {
      onScore?.(Math.floor(event.data.score));
    }
  }, [onScore]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-black rounded border border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
        <span className="text-[10px] text-text-muted tracking-wider">
          GAME #{gameId.slice(0, 8)} — SANDBOXED
        </span>
        <button
          onClick={toggleFullscreen}
          className="text-[10px] text-text-secondary hover:text-terminal transition-colors"
        >
          [{isFullscreen ? 'EXIT' : 'FULLSCREEN'}]
        </button>
      </div>

      {/* Sandboxed game iframe */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        srcDoc={gameHtml}
        referrerPolicy="no-referrer"
        className="w-full border-0"
        style={{
          height: isFullscreen ? 'calc(100vh - 32px)' : '600px',
          background: '#000',
        }}
        title="Game"
      />
    </div>
  );
}
