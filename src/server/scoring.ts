// Barrel: the scoring implementation moved to src/shared/scoring.ts (Stage
// 3.7) so the client's answer-independent live preview can call the EXACT
// same functions as the server — one source of truth, zero duplicated
// formula. All existing imports and tests keep working unchanged; the
// formula, constants and golden vectors are untouched.
export * from '../shared/scoring.ts';
