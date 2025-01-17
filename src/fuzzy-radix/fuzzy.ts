const SCORE_MIN: number = Number.NEGATIVE_INFINITY;
const SCORE_MAX: number = Number.POSITIVE_INFINITY;

const SCORE_GAP_LEADING = -0.005;
const SCORE_GAP_TRAILING = -0.005;
const SCORE_GAP_INNER = -0.01;
const SCORE_MATCH_CONSECUTIVE = 1.0;
const SCORE_MATCH_SLASH = 0.9;
const SCORE_MATCH_WORD = 0.8;
const SCORE_MATCH_CAPITAL = 0.7;
const SCORE_MATCH_DOT = 0.6;

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

	const D = create2dArray(n, m);
	const M = create2dArray(n, m);
	compute(needle, haystack, D, M);

	return M[n - 1][m - 1];
}

function create2dArray(n: number, m: number): Int32Array[] {
	const rtArr = new Array(n);
	for (let i = 0; i < rtArr.length; i++) {
		rtArr[i] = new Int32Array(m);
	}
	return rtArr;
}

function isLower(s: string) {
	return s.toLowerCase() === s;
}

function isUpper(s: string) {
	return s.toUpperCase() === s;
}

function precomputeBonuses(haystack: string): Int32Array {
	/* Which positions are beginning of words */
	const matchBonuses = new Int32Array(haystack.length);

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
	D: Int32Array[],
	M: Int32Array[],
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
				D[i][j] = score;
				M[i][j] = prev_score = Math.max(score, prev_score + gap_score);
			} else {
				D[i][j] = SCORE_MIN;
				M[i][j] = prev_score = prev_score + gap_score;
			}
		}
	}
}
