import { useState } from 'react';
import { formatQuantity } from '../../shared/api';
import type { ChallengePublic } from '../../shared/api';
import {
  caughtScorePreview,
  formatPreviewPoints,
  precisionBand,
  widthDecades,
} from '../../shared/preview';
import { RangeDial } from './RangeDial';

type ChallengeCardProps = {
  challenge: ChallengePublic;
  l: number;
  u: number;
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

type Editing = 'lower' | 'upper' | null;

/**
 * The estimation screen (Stage 3.7): the instrument at work, now with a live
 * answer-independent preview — bounds, width, relative precision, and the
 * exact score IF the range catches the truth (computed by the shared scoring
 * module; no miss-side information exists anywhere in this component).
 * Values stay in log10 space internally; displayed quantities are physical.
 */
export const ChallengeCard = ({ challenge, l, u, disabled, onChange }: ChallengeCardProps) => {
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);

  const lowerKm = Math.pow(10, l);
  const upperKm = Math.pow(10, u);
  const width = widthDecades(l, u);
  const band = precisionBand(width, challenge.domain.b - challenge.domain.a);
  const ifCaught = caughtScorePreview(l, u, challenge.domain.b - challenge.domain.a);
  const minV = Math.pow(10, challenge.domain.a);
  const maxV = Math.pow(10, challenge.domain.b);

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }

  const beginEdit = (which: Exclude<Editing, null>): void => {
    setInvalid(null);
    setDraft(formatQuantity(which === 'lower' ? lowerKm : upperKm).replace(/,/g, ''));
    setEditing(which);
  };

  const commitEdit = (): void => {
    if (editing === null) return;
    const parsed = Number.parseFloat(draft.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInvalid('Enter a number, e.g. 45,000');
      return;
    }
    const asLog = Math.log10(parsed);
    if (parsed < minV || parsed > maxV) {
      setInvalid(`Between ${formatQuantity(minV)} and ${formatQuantity(maxV)} ${challenge.unit}`);
      return;
    }
    if (editing === 'lower') {
      if (asLog >= u) {
        setInvalid('Lower bound must stay below the upper bound');
        return;
      }
      onChange(asLog, u);
    } else {
      if (asLog <= l) {
        setInvalid('Upper bound must stay above the lower bound');
        return;
      }
      onChange(l, asLog);
    }
    setInvalid(null);
    setEditing(null);
  };

  const cancelEdit = (): void => {
    setEditing(null);
    setInvalid(null);
  };

  return (
    <div style={{ display: 'contents' }}>
      <header className="rf-g-top">
        <div style={{ minWidth: 0 }}>
          <p className="rf-kick" style={{ margin: 0 }}>
            Today’s measurement · log scale {challenge.minLabel}–{challenge.maxLabel}
          </p>
          <h2 className="rf-q">{challenge.prompt}</h2>
        </div>
      </header>

      <div className="rf-counters" aria-hidden="false">
        {editing === 'lower' ? (
          <div className="rf-counter is-editing">
            <label className="rf-c-lab" htmlFor="rf-edit-low">
              Lower bound
            </label>
            <input
              id="rf-edit-low"
              className="rf-c-input"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={draft}
              disabled={disabled}
              aria-describedby={invalid !== null ? 'rf-edit-err' : undefined}
              aria-invalid={invalid !== null}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={commitEdit}
            />
            <span className="rf-c-unit">{challenge.unit} · Enter ✓ · Esc ✕</span>
          </div>
        ) : (
          <button
            type="button"
            className="rf-counter as-btn"
            onClick={() => beginEdit('lower')}
            disabled={disabled}
            aria-label={`Lower bound ${formatQuantity(lowerKm)} ${challenge.unit}. Tap to type an exact value.`}
          >
            <span className="rf-c-lab">Lower bound ⌄</span>
            <span className="rf-c-val" aria-live="polite">
              {formatQuantity(lowerKm)}
            </span>
            <span className="rf-c-unit">{challenge.unit}</span>
          </button>
        )}
        <div className="rf-c-joint" aria-hidden="true">
          <i />
          <i />
        </div>
        {editing === 'upper' ? (
          <div className="rf-counter is-editing">
            <label className="rf-c-lab" htmlFor="rf-edit-high">
              Upper bound
            </label>
            <input
              id="rf-edit-high"
              className="rf-c-input"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={draft}
              disabled={disabled}
              aria-describedby={invalid !== null ? 'rf-edit-err' : undefined}
              aria-invalid={invalid !== null}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={commitEdit}
            />
            <span className="rf-c-unit">{challenge.unit} · Enter ✓ · Esc ✕</span>
          </div>
        ) : (
          <button
            type="button"
            className="rf-counter as-btn"
            onClick={() => beginEdit('upper')}
            disabled={disabled}
            aria-label={`Upper bound ${formatQuantity(upperKm)} ${challenge.unit}. Tap to type an exact value.`}
          >
            <span className="rf-c-lab">Upper bound ⌄</span>
            <span className="rf-c-val" aria-live="polite">
              {formatQuantity(upperKm)}
            </span>
            <span className="rf-c-unit">{challenge.unit}</span>
          </button>
        )}
      </div>

      {invalid !== null ? (
        <p id="rf-edit-err" className="rf-c-err" role="alert">
          ✕ {invalid}
        </p>
      ) : null}

      <RangeDial
        a={challenge.domain.a}
        b={challenge.domain.b}
        l={l}
        u={u}
        disabled={disabled}
        onChange={onChange}
      />

      <div className="rf-rulerzone">
        <div className="rf-ruler" aria-hidden="true">
          {decades.map((t) => (
            <span key={t}>{formatQuantity(Math.pow(10, t))}</span>
          ))}
        </div>
      </div>

      <div className="rf-preview" aria-live="polite">
        <div className="rf-prev-row">
          <span className="rf-prev-cell">
            <span className="rf-prev-lab">Range width</span>
            <span className="rf-prev-num">{width.toFixed(2)} decades</span>
          </span>
          <span className={`rf-prev-band rf-band-${band.label.replace(' ', '-').toLowerCase()}`}>
            <span className="rf-prev-lab">Precision</span>
            <span className="rf-prev-num">{band.label}</span>
            <span className="rf-prev-meter" aria-hidden="true">
              <i style={{ left: `${band.fraction * 100}%` }} />
            </span>
          </span>
          <span className="rf-prev-cell rf-prev-catch">
            <span className="rf-prev-lab">If you catch it</span>
            <span className="rf-prev-num">{formatPreviewPoints(ifCaught)} pts</span>
          </span>
        </div>
        <p className="rf-prev-note">
          Exact score depends only on your width if the truth is inside — the server reveals the
          verdict when you lock.
        </p>
      </div>

      <p className="rf-howto">
        Drag both <b>brass thumbs</b> (arrow keys work too — Shift jumps further), or tap a value
        to type it. Wider windows are safer but score less; missing the truth scores{' '}
        <b>negative</b>.
      </p>
    </div>
  );
};
