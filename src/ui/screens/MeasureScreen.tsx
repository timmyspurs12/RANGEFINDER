import { useState } from 'react';
import { formatFull, formatSigned, formatWidth } from '../../game/format.ts';
import { normalizeInterval } from '../../game/scale.ts';
import type { Challenge } from '../../game/challenges.ts';
import { RangeRuler } from '../components/RangeRuler.tsx';
import { TopBar } from '../components/TopBar.tsx';
import type { StreakInfo } from '../../game/dates.ts';

interface MeasureScreenProps {
  challenge: Challenge;
  dayLabel: string;
  dayNumber: number;
  streak: StreakInfo;
  playersToday: number;
  theme: 'light' | 'dark';
  muted: boolean;
  low: number;
  high: number;
  hitScore: number;
  missScore: number;
  busy: boolean;
  onToggleTheme: () => void;
  onToggleMuted: () => void;
  onChange: (low: number, high: number, hint: 'low' | 'high') => void;
  onSettle: (snapped: boolean) => void;
  onLock: () => void;
}

/** MEASURE — the ruler is the game; live score preview feeds the tension. */
export const MeasureScreen = ({
  challenge,
  dayLabel,
  dayNumber,
  streak,
  playersToday,
  theme,
  muted,
  low,
  high,
  hitScore,
  missScore,
  busy,
  onToggleTheme,
  onToggleMuted,
  onChange,
  onSettle,
  onLock,
}: MeasureScreenProps) => {
  const [editing, setEditing] = useState<'low' | 'high' | null>(null);
  const [draft, setDraft] = useState('');

  const commitEdit = (): void => {
    if (editing === null) return;
    const parsed = Number.parseFloat(draft.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      const asLog = Math.log10(parsed);
      const next = normalizeInterval(
        editing === 'low' ? asLog : low,
        editing === 'low' ? high : asLog,
        challenge.domain,
        editing
      );
      onChange(next.low, next.high, editing);
    }
    setEditing(null);
  };

  const width = high - low;

  return (
    <>
      <TopBar
        compact
        dayLabel={dayLabel}
        dayNumber={dayNumber}
        streak={streak}
        playersToday={playersToday}
        theme={theme}
        muted={muted}
        onToggleTheme={onToggleTheme}
        onToggleMuted={onToggleMuted}
      />
      <section className="measure rf4-rise">
        <p className="kicker">Survey in progress · {challenge.unit}</p>
        <h2 className="question q-measure">{challenge.prompt}</h2>

        <div className="chips">
          {editing === 'low' ? (
            <span className="edit-chip">
              <label className="chip-lab" htmlFor="edit-low">LOW</label>
              <input
                id="edit-low"
                className="edit-input"
                inputMode="decimal"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(null);
                }}
                aria-label="Type lower bound"
              />
              <span className="chip-unit">{challenge.unit}</span>
            </span>
          ) : (
            <button
              type="button"
              className="chip chip-big"
              onClick={() => {
                setDraft(formatFull(Math.pow(10, low)));
                setEditing('low');
              }}
              aria-label={`Lower bound ${formatFull(Math.pow(10, low))} ${challenge.unit}. Tap to type.`}
            >
              <span className="chip-lab">LOW</span>
              <span className="chip-num">{formatFull(Math.pow(10, low))}</span>
            </button>
          )}

          <span className="net" aria-live="polite">
            net {formatWidth(width)}
          </span>

          {editing === 'high' ? (
            <span className="edit-chip">
              <label className="chip-lab" htmlFor="edit-high">HIGH</label>
              <input
                id="edit-high"
                className="edit-input"
                inputMode="decimal"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(null);
                }}
                aria-label="Type upper bound"
              />
              <span className="chip-unit">{challenge.unit}</span>
            </span>
          ) : (
            <button
              type="button"
              className="chip chip-big"
              onClick={() => {
                setDraft(formatFull(Math.pow(10, high)));
                setEditing('high');
              }}
              aria-label={`Upper bound ${formatFull(Math.pow(10, high))} ${challenge.unit}. Tap to type.`}
            >
              <span className="chip-lab">HIGH</span>
              <span className="chip-num">{formatFull(Math.pow(10, high))}</span>
            </button>
          )}
        </div>

        <RangeRuler
          domain={challenge.domain}
          low={low}
          high={high}
          unit={challenge.unit}
          disabled={busy}
          onChange={onChange}
          onSettle={onSettle}
        />

        <div className="preview" aria-live="polite">
          <span className="pcell win">✓ HIT {formatSigned(hitScore)}</span>
          <span className="pcell verm">✕ MISS {formatSigned(missScore)}</span>
        </div>

        <button type="button" className="btn primary cta lock" onClick={onLock} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Locking…
            </>
          ) : (
            'Lock it in'
          )}
        </button>
        <p className="fine-line">
          One submission per day · pin it exactly for 100 · full scale scores 5 · miss scores
          negative
        </p>
      </section>
    </>
  );
};
