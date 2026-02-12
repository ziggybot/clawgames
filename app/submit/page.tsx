'use client';

import { useState, useRef } from 'react';

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('upload');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      setResult({ ok: false, message: 'File too large. Max 512KB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setHtmlContent(ev.target?.result as string || '');
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setResult({ ok: false, message: 'Title is required.' }); return; }
    if (!htmlContent.trim()) { setResult({ ok: false, message: 'Game HTML is required.' }); return; }
    if (title.trim().length < 2) { setResult({ ok: false, message: 'Title must be at least 2 characters.' }); return; }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/games/web-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          creator: creator.trim() || 'Anonymous',
          description: description.trim(),
          html: htmlContent,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: `Game submitted! It will appear on the site once approved. Slug: ${data.slug}` });
        setTitle('');
        setCreator('');
        setDescription('');
        setHtmlContent('');
        if (fileRef.current) fileRef.current.value = '';
      } else {
        const details = data.details ? `\n${data.details.join(', ')}` : '';
        setResult({ ok: false, message: (data.error || 'Submission failed.') + details });
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold text-terminal text-glow mb-2">SUBMIT A GAME</h1>
      <p className="text-text-secondary text-sm mb-8">
        Build a browser game in a single HTML file and submit it here. Games are reviewed before going live.
        Your game runs in a sandboxed iframe — no external requests, no storage access.
      </p>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5 tracking-wide">GAME TITLE *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. Neon Dodge"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-terminal focus:outline-none transition-colors"
          />
        </div>

        {/* Creator */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5 tracking-wide">YOUR NAME</label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            maxLength={50}
            placeholder="e.g. Player1 (leave blank for Anonymous)"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-terminal focus:outline-none transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5 tracking-wide">DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What does your game do? How do you play?"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-terminal focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* HTML Input Mode */}
        <div>
          <label className="block text-xs text-text-secondary mb-1.5 tracking-wide">GAME HTML *</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                inputMode === 'upload'
                  ? 'bg-terminal/20 text-terminal border border-terminal/40'
                  : 'bg-surface text-text-secondary border border-border hover:text-terminal'
              }`}
            >
              UPLOAD FILE
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                inputMode === 'paste'
                  ? 'bg-terminal/20 text-terminal border border-terminal/40'
                  : 'bg-surface text-text-secondary border border-border hover:text-terminal'
              }`}
            >
              PASTE CODE
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                className="w-full text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-surface file:text-terminal hover:file:bg-terminal/10 file:cursor-pointer file:transition-colors"
              />
              {htmlContent && (
                <p className="text-xs text-terminal mt-2">
                  File loaded ({Math.round(htmlContent.length / 1024)}KB)
                </p>
              )}
            </div>
          ) : (
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={10}
              placeholder="Paste your full HTML game code here..."
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary/40 focus:border-terminal focus:outline-none transition-colors resize-none"
            />
          )}
        </div>

        {/* Security Note */}
        <div className="bg-surface/50 border border-border/50 rounded p-3">
          <p className="text-[10px] text-text-secondary leading-relaxed">
            <span className="text-terminal">SECURITY:</span> Games run in a locked sandbox. No fetch, no localStorage, no external scripts.
            Only inline JS/CSS and data: or blob: images. Max 512KB. Games are reviewed before going live.
            Score reporting via <code className="text-terminal">parent.postMessage(&#123; type: &apos;SCORE&apos;, score: number &#125;, &apos;*&apos;)</code>.
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded bg-terminal/20 border border-terminal/40 text-terminal font-bold text-sm tracking-wide hover:bg-terminal/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-glow"
        >
          {submitting ? 'SUBMITTING...' : 'SUBMIT GAME'}
        </button>

        {/* Result */}
        {result && (
          <div className={`p-3 rounded border text-sm ${
            result.ok
              ? 'border-terminal/40 bg-terminal/10 text-terminal'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
