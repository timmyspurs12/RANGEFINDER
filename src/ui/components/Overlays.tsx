import { useEffect, useState } from 'react';
import { formatCompact, formatSigned, formatWidth } from '../../game/format.ts';
import type { LeaderRow } from '../adapter.ts';

/** Slide-up sheet shell: backdrop + panel. One internal scroll container. */
export const Sheet = ({
  title,
  onClose,
  children,
  open,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export interface ConfirmData {
  lowValue: number;
  highValue: number;
  unit: string;
  width: number;
  hitScore: number;
  missScore: number;
}

export const ConfirmSheet = ({ open, data, onBack, onConfirm, busy }: {
  open: boolean;
  data: ConfirmData | null;
  onBack: () => void;
  onConfirm: () => void;
  busy: boolean;
}) => (
  <Sheet title="Lock it in?" open={open && data !== null} onClose={onBack}>
    {data ? (
      <div className="confirm">
        <p className="confirm-range">
          {formatCompact(data.lowValue)} – {formatCompact(data.highValue)}{' '}
          <span className="confirm-unit">{data.unit}</span>
        </p>
        <p className="confirm-net">net width {formatWidth(data.width)}</p>
        <div className="confirm-preview">
          <span className="pcell win">✓ HIT {formatSigned(data.hitScore)}</span>
          <span className="pcell verm">✕ MISS {formatSigned(data.missScore)}</span>
        </div>
        <p className="confirm-warn">One shot a day — a locked range can’t be changed.</p>
        <div className="confirm-actions">
          <button type="button" className="btn ghost-btn" onClick={onBack} disabled={busy}>
            Back
          </button>
          <button type="button" className="btn primary" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> Locking…
              </>
            ) : (
              'Lock it in'
            )}
          </button>
        </div>
      </div>
    ) : null}
  </Sheet>
);

export const ShareSheet = ({ open, text, onClose, onPost, postState }: {
  open: boolean;
  text: string;
  onClose: () => void;
  onPost: () => Promise<void>;
  postState: 'idle' | 'posting' | 'posted';
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard API can be unavailable in embedded webviews — fall back.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
    }
  };
  return (
    <Sheet title="Share (spoiler-free)" open={open} onClose={onClose}>
      <div className="share">
        <pre className="share-card">{text}</pre>
        <div className="confirm-actions">
          <button type="button" className="btn ghost-btn" onClick={() => void copy()}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={postState !== 'idle'}
            onClick={() => void onPost()}
          >
            {postState === 'posting' ? 'Posting…' : postState === 'posted' ? 'Posted ✓' : 'Post as comment'}
          </button>
        </div>
        {postState === 'posted' ? (
          <p className="share-note">Posted to the thread (prototype: mock post).</p>
        ) : null}
      </div>
    </Sheet>
  );
};

export const LeaderboardSheet = ({ onClose, load, myRank }: {
  open: boolean;
  onClose: () => void;
  load: (tab: 'daily' | 'alltime') => Promise<LeaderRow[]>;
  myRank: number | null;
}) => {
  const [tab, setTab] = useState<'daily' | 'alltime'>('daily');
  const [data, setData] = useState<{ tab: 'daily' | 'alltime'; rows: LeaderRow[] } | null>(null);
  useEffect(() => {
    let alive = true;
    void load(tab).then((r) => {
      if (alive) setData({ tab, rows: r });
    });
    return () => {
      alive = false;
    };
  }, [tab, load]);
  const rows = data !== null && data.tab === tab ? data.rows : null;
  return (
    <Sheet title="Leaderboard" open onClose={onClose}>
      <div className="lb">
        <div className="lb-tabs" role="tablist">
          {(['daily', 'alltime'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`lb-tab${tab === t ? ' on' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'daily' ? 'Today' : 'All-time'}
            </button>
          ))}
        </div>
        {rows === null ? (
          <div className="lb-skeleton" aria-label="Loading leaderboard">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="lb-row skel" />
            ))}
          </div>
        ) : (
          <ol className="lb-list">
            {rows.map((r) => (
              <li key={`${r.rank}-${r.name}`} className={`lb-row${r.isMe ? ' me' : ''}`}>
                <span className="lb-rank">{r.rank}</span>
                <span className="lb-name">{r.name}</span>
                <span className="lb-cal" title="Calibration rating — hits achieved with narrow ranges">
                  {r.calibration}% cal
                </span>
                <span className="lb-score">{formatSigned(r.score)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="lb-foot">
          Calibration rating = hits achieved with narrow ranges.{' '}
          {myRank !== null ? `You're #${myRank} today.` : 'Lock a range to appear.'}
        </p>
      </div>
    </Sheet>
  );
};
