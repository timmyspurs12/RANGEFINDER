// Server-authoritative submission record assembly.
//
// UNIT CONTRACT (Stage 3.3 hotfix):
// - `l` and `u` arrive from the client in log10 space (the dial's coordinates).
// - `ChallengeDef.answer` is the raw positive physical quantity (e.g. 40075 km).
// - `scoreApproved`/`winklerLog` require l, u AND y in log10 space, and R is
//   the log10-domain width (b − a).
// The raw answer is therefore converted to log10 space EXACTLY ONCE, here, at
// the scoring call — and the RAW value is preserved in the returned record for
// display (ResultReveal positions the truth marker with
// Math.log10(result.answer); user-facing quantities stay physical).
import type { ChallengeDef } from './challenge';
import { formatQuantity } from '../shared/api.ts';
import type { ScoreRecord } from '../shared/api.ts';
import { scoreApproved } from './scoring.ts';

export function buildRecord(
  challenge: ChallengeDef,
  l: number,
  u: number,
  at: number
): ScoreRecord {
  // y must be in the same log10 space as l and u. Passing the raw answer here
  // caused the live-playtest defect: for l = 4.68, u = 5.00 (47,863–100,000 km)
  // the buggy call produced W = 0.32 + 20·(40075 − 5) = 801,400.32 and
  // S = −20,034,908.0 — exactly the values on the developer's screenshot.
  // See src/server/record.test.ts for the regression.
  const scored = scoreApproved(
    l,
    u,
    Math.log10(challenge.answer),
    challenge.domain.b - challenge.domain.a
  );
  return {
    l,
    u,
    W: scored.W,
    S: scored.S,
    caught: scored.caught,
    answer: challenge.answer, // RAW physical quantity — never log10 in the record
    answerLabel: formatQuantity(challenge.answer),
    unit: challenge.unit,
    explanation: challenge.explanation,
    at,
  };
}
