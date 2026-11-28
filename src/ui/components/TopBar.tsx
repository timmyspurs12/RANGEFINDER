import type { StreakInfo } from '../../game/dates.ts';

interface TopBarProps {
  dayLabel: string;
  dayNumber: number;
  streak: StreakInfo;
  playersToday: number;
  theme: 'light' | 'dark';
  muted: boolean;
  compact?: boolean;
  onToggleTheme: () => void;
  onToggleMuted: () => void;
}

/** Instrument chrome: brand plate, day/streak/players chips, theme + sound. */
export const TopBar = ({
  dayLabel,
  dayNumber,
  streak,
  playersToday,
  theme,
  muted,
  compact,
  onToggleTheme,
  onToggleMuted,
}: TopBarProps) => (
  <header className={`tb${compact ? ' tb-compact' : ''}`}>
    <div className="tb-brand">
      <span className="tb-name">Rangefinder</span>
      <span className="tb-day">
        #{dayNumber} · {dayLabel}
      </span>
      <span className="tb-mock" title="Prototype preview with mock crowd data">MOCK</span>
    </div>
    <div className="tb-chips">
      <span className="chip" title={`Streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}>
        🔥 {streak.current}
      </span>
      <span className="chip" title="Players today">{playersToday} playing</span>
      <button
        type="button"
        className="iconbtn"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.4">
              <path d="M8 1.2v2M8 12.8v2M1.2 8h2M12.8 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M12.8 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4" />
            </g>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 9.8A5.7 5.7 0 0 1 6.2 2.5a5.7 5.7 0 1 0 7.3 7.3Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="iconbtn"
        onClick={onToggleMuted}
        aria-label={muted ? 'Turn sound effects on' : 'Turn sound effects off'}
        aria-pressed={!muted}
      >
        {muted ? (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 6v4h2.6L8.4 13V3L5.1 6H2.5Z" fill="currentColor" />
            <path d="M10.6 6.2 14 9.8M14 6.2l-3.4 3.6" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 6v4h2.6L8.4 13V3L5.1 6H2.5Z" fill="currentColor" />
            <path d="M10.6 5.4a3.6 3.6 0 0 1 0 5.2M12.4 3.6a6.2 6.2 0 0 1 0 8.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        )}
      </button>
    </div>
  </header>
);
