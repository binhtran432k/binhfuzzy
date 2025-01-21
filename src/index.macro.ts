const SCORE_TOLERANCE = 0.3;

const SCORE_MIN = 0;
const SCORE_MAX = 65_535;

const SCORE_GAP_LEADING = -1 * SCORE_TOLERANCE;
const SCORE_GAP_TRAILING = -1 * SCORE_TOLERANCE;
const SCORE_GAP_INNER = -2 * SCORE_TOLERANCE;

const SCORE_MATCH_CONSECUTIVE = Math.trunc(200 * SCORE_TOLERANCE);
const SCORE_MATCH_SLASH = Math.trunc(SCORE_MATCH_CONSECUTIVE * 0.9);
const SCORE_MATCH_WORD = Math.trunc(SCORE_MATCH_CONSECUTIVE * 0.8);
const SCORE_MATCH_CAPITAL = Math.trunc(SCORE_MATCH_CONSECUTIVE * 0.7);
const SCORE_MATCH_DOT = Math.trunc(SCORE_MATCH_CONSECUTIVE * 0.6);

const BOUND_OUT_OF_SCORE = 1024;
const SCORE_BASE = 1 + Math.ceil(BOUND_OUT_OF_SCORE * SCORE_TOLERANCE);

const MacroValueMap = {
	ScoreMin: SCORE_MIN as number,
	ScoreMax: SCORE_MAX as number,

	ScoreMatchConsecutive: SCORE_MATCH_CONSECUTIVE as number,
	ScoreMatchSlash: SCORE_MATCH_SLASH as number,
	ScoreMatchWord: SCORE_MATCH_WORD as number,
	ScoreMatchCapital: SCORE_MATCH_CAPITAL as number,
	ScoreMatchDot: SCORE_MATCH_DOT as number,

	ScoreGapLeading: SCORE_GAP_LEADING as number,
	ScoreGapTrailing: SCORE_GAP_TRAILING as number,
	ScoreGapInner: SCORE_GAP_INNER as number,

	BoundOutOfScore: BOUND_OUT_OF_SCORE as number,
	ScoreBase: SCORE_BASE as number,
};

export function getMacroValue(valueKey: keyof typeof MacroValueMap): number {
	return MacroValueMap[valueKey];
}
