const SCORE_MIN: number = -32767;
const SCORE_MAX: number = 32767;

const SCORE_GAP_LEADING = -0.5;
const SCORE_GAP_TRAILING = -0.5;
const SCORE_GAP_INNER = -1;
const SCORE_MATCH_CONSECUTIVE = 100;
const SCORE_MATCH_SLASH = 90;
const SCORE_MATCH_WORD = 80;
const SCORE_MATCH_CAPITAL = 70;
const SCORE_MATCH_DOT = 60;

type ScoreArray = Int16Array;
const ScoreArray = Int16Array;
type BonusArray = Uint8Array;
const BonusArray = Uint8Array;

export function hasMatch(needle: string, haystack: string): boolean {
	const lowerNeedle = needle.toLowerCase();
	const lowerHaystack = haystack.toLowerCase();
	for (let i = 0, j = 0; i < lowerNeedle.length; i += 1) {
		j = lowerHaystack.indexOf(lowerNeedle[i], j) + 1;
		if (j === 0) return false;
	}
	return true;
}

export function computeScore(needle: string, haystack: string): number {
	const n = needle.length;
	const m = haystack.length;

	if (!n || !m) return SCORE_MIN;

	if (n === m) {
		// Since this method can only be called with a haystack which
		// matches needle. If the lengths of the strings are equal the
		// strings themselves must also be equal (ignoring case).
		return SCORE_MAX;
	}

	if (m > 1024) {
		// Unreasonably large candidate: return no score
		// If it is a valid match it will still be returned, it will
		// just be ranked below any reasonably sized candidates
		return SCORE_MIN;
	}

	return _computeScore(needle, haystack);
}

function isLower(s: string) {
	return s.toLowerCase() === s;
}

function isUpper(s: string) {
	return s.toUpperCase() === s;
}

function precomputeBonuses(haystack: string): BonusArray {
	// Which positions are beginning of words
	const matchBonuses = new BonusArray(haystack.length);

	let lastChar = "/";
	for (let i = 0; i < haystack.length; i++) {
		const ch = haystack[i];

		if (lastChar === "/") {
			matchBonuses[i] = SCORE_MATCH_SLASH;
		} else if (lastChar === "-" || lastChar === "_" || lastChar === " ") {
			matchBonuses[i] = SCORE_MATCH_WORD;
		} else if (lastChar === ".") {
			matchBonuses[i] = SCORE_MATCH_DOT;
		} else if (isLower(lastChar) && isUpper(ch)) {
			matchBonuses[i] = SCORE_MATCH_CAPITAL;
		} else {
			matchBonuses[i] = 0;
		}

		lastChar = ch;
	}

	return matchBonuses;
}

function _computeScore(needle: string, haystack: string): number {
	const n = needle.length;
	const m = haystack.length;

	const lowerNeedle = needle.toLowerCase();
	const lowerHaystack = haystack.toLowerCase();

	const matchBonuses = precomputeBonuses(haystack);

	/** Stores the best possible score at this position. */
	const M = new ScoreArray(m);
	/** Stores the best score for this position ending with a match. */
	const D = new ScoreArray(m);

	for (let i = 0; i < n; i++) {
		const gapScore = i === n - 1 ? SCORE_GAP_TRAILING : SCORE_GAP_INNER;
		let prevScore = SCORE_MIN;

		let prevM = 0;
		let prevD = 0;

		for (let j = 0; j < m; j++) {
			if (lowerNeedle[i] === lowerHaystack[j]) {
				let score = SCORE_MIN;
				if (i === 0) {
					score = j * SCORE_GAP_LEADING + matchBonuses[j];
				} else if (j > 0) {
					// i > 0 && j > 0
					score = Math.max(
						prevM + matchBonuses[j],
						// consecutive match, doesn't stack with match_bonus
						prevD + SCORE_MATCH_CONSECUTIVE,
					);
				}
				prevD = D[j];
				D[j] = Math.min(Math.max(SCORE_MIN, Math.trunc(score)), SCORE_MAX);
				prevScore = Math.max(score, prevScore + gapScore);
			} else {
				prevD = D[j];
				D[j] = SCORE_MIN;
				prevScore = prevScore + gapScore;
			}
			prevM = M[j];
			M[j] = Math.min(Math.max(SCORE_MIN, Math.trunc(prevScore)), SCORE_MAX);
		}
	}

	return M[m - 1];
}
