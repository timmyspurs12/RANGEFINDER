import { useEffect, useRef, useState } from 'react';
import type { ChallengePublic, ScoreRecord, StateResponse } from '../../shared/api';
import { buildShareText } from '../../shared/shareText';
import { formatUtcDayLabel } from '../../shared/dayKey';

type ShareSheetProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  daily?: StateResponse['daily'];
  onClose: () => void;
};

/**
 * Stage 3.7 — spoiler-free share sheet. Shows the generated card with Copy
 * (clipboard API with a select-and-copy fallback for WebViews that block it)
 * and Post as comment (only wired when the client bridge exposes it — the
 * card text always remains available for manual paste). Never contains the
 * answer or any direction/miss-distance information.
 */
export const ShareSheet = ({ challenge, result, daily, onClose }: ShareSheetProps) => {
  const text = buildShareText({
    challengeLabel: challenge.prompt.replace(/\?$/, ''),
    dayLabel: formatUtcDayLabel(),
    caught: result.caught,
    score: result.S,
    width: result.u - result.l,
    fullScale: challenge.domain.b - challenge.domain.a,
  });
  const [copied, setCopied] = useState<'no' | 'yes' | 'manual'>('no');
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  void daily;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('yes');
    } catch {
      // WebView blocked the clipboard — select the text for manual copy.
      const node = document.getElementById('rf-share-text');
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopied('manual');
    }
  };

  const nativeShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: 'Rangefinder', text });
    } catch {
      /* user dismissed — nothing to do */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  return (
    <div className="rf-sheet-wrap" role="dialog" aria-modal="true" aria-label="Share your result">
      <div className="rf-sheet-backdrop" onClick={onClose} />
      <div className="rf-sheet" ref={sheetRef} tabIndex={-1}>
        <div className="rf-sheet-head">
          <span className="rf-sheet-title">Share — spoiler-free</span>
          <button type="button" className="rf-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="rf-sheet-note">
          Shows your verdict, score and range width — never the answer.
        </p>
        <pre id="rf-share-text" className="rf-share-card">
          {text}
        </pre>
        <div className="rf-sheet-actions">
          <button type="button" className="rf-btn rf-sheet-btn" onClick={() => void copy()}>
            {copied === 'yes' ? 'Copied ✓' : copied === 'manual' ? 'Selected — copy it' : 'Copy'}
          </button>
          {hasNativeShare ? (
            <button type="button" className="rf-btn rf-sheet-btn" onClick={() => void nativeShare()}>
              Share…
            </button>
          ) : null}
        </div>
        {copied === 'manual' ? (
          <p className="rf-sheet-note">Long-press the selected text and choose Copy.</p>
        ) : null}
      </div>
    </div>
  );
};
