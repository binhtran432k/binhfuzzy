const SCORE_MIN: number = -127;
const SCORE_MAX: number = 127;

const SCORE_GAP_LEADING = -0.05;
const SCORE_GAP_TRAILING = -0.05;
const SCORE_GAP_INNER = -0.1;
const SCORE_MATCH_CONSECUTIVE = 10;
const SCORE_MATCH_SLASH = 9;
const SCORE_MATCH_WORD = 8;
const SCORE_MATCH_CAPITAL = 7;
const SCORE_MATCH_DOT = 6;

type ScoreArray = Int8Array;
const ScoreArray = Int8Array;
type BonusArray = Int8Array;
const BonusArray = Int8Array;

export function search(needle: string, haystacks: string[]): string[] {
	return haystacks
		.filter((stack) => hasMatch(needle, stack))
		.map((x) => [x, score(needle, x)] as [string, number])
		.sort(([, a], [, b]) => b - a)
		.map(([x]) => x);
}

function hasMatch(needle: string, haystack: string): boolean {
	const lowerNeedle = needle.toLowerCase();
	const lowerHaystack = haystack.toLowerCase();
	for (let i = 0, j = 0; i < lowerNeedle.length; i += 1) {
		if (lowerNeedle[i] === " ") continue;
		j = lowerHaystack.indexOf(lowerNeedle[i], j) + 1;
		if (j === 0) return false;
	}
	return true;
}

function score(needle: string, haystack: string): number {
	const n = needle.length;
	const m = haystack.length;

	if (!n || !m) return SCORE_MIN;

	if (n === m) {
		/* Since this method can only be called with a haystack which
		 * matches needle. If the lengths of the strings are equal the
		 * strings themselves must also be equal (ignoring case).
		 */
		return SCORE_MAX;
	}

	if (m > 1024) {
		/*
		 * Unreasonably large candidate: return no score
		 * If it is a valid match it will still be returned, it will
		 * just be ranked below any reasonably sized candidates
		 */
		return SCORE_MIN;
	}

	const D = createScoreMatrix(n, m);
	const M = createScoreMatrix(n, m);
	compute(needle, haystack, D, M);

	return M[n - 1][m - 1];
}

function createScoreMatrix(n: number, m: number): ScoreArray[] {
	const rtArr = new Array(n);
	for (let i = 0; i < rtArr.length; i++) {
		rtArr[i] = new ScoreArray(m);
	}
	return rtArr;
}

function isLower(s: string) {
	return s.toLowerCase() === s;
}

function isUpper(s: string) {
	return s.toUpperCase() === s;
}

function precomputeBonuses(haystack: string): BonusArray {
	/* Which positions are beginning of words */
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

function compute(
	needle: string,
	haystack: string,
	D: ScoreArray[],
	M: ScoreArray[],
): void {
	const n = needle.length;
	const m = haystack.length;

	const lowerNeedle = needle.toLowerCase();
	const lowerHaystack = haystack.toLowerCase();

	const matchBonuses = precomputeBonuses(haystack);

	/*
	 * D[][] Stores the best score for this position ending with a match.
	 * M[][] Stores the best possible score at this position.
	 */

	for (let i = 0; i < n; i++) {
		const gap_score = i === n - 1 ? SCORE_GAP_TRAILING : SCORE_GAP_INNER;
		let prev_score = SCORE_MIN;

		for (let j = 0; j < m; j++) {
			if (lowerNeedle[i] === lowerHaystack[j] || lowerNeedle[i] === " ") {
				let score = SCORE_MIN;
				if (i === 0) {
					score = j * SCORE_GAP_LEADING + matchBonuses[j];
				} else if (j > 0) {
					/* i > 0 && j > 0*/
					score = Math.max(
						M[i - 1][j - 1] + matchBonuses[j],

						/* consecutive match, doesn't stack with match_bonus */
						D[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE,
					);
				}
				D[i][j] = Math.min(Math.max(SCORE_MIN, Math.trunc(score)), SCORE_MAX);
				prev_score = Math.max(score, prev_score + gap_score);
			} else {
				D[i][j] = SCORE_MIN;
				prev_score = prev_score + gap_score;
			}
			M[i][j] = Math.min(
				Math.max(SCORE_MIN, Math.trunc(prev_score)),
				SCORE_MAX,
			);
		}
	}
}
