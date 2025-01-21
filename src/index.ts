const SCORE_MIN: number = 0;
const SCORE_MAX: number = 65_535;

const SCORE_GAP_LEADING = -0.5;
const SCORE_GAP_TRAILING = -0.5;
const SCORE_GAP_INNER = -1;
const SCORE_MATCH_CONSECUTIVE = 100;
const SCORE_MATCH_SLASH = 90;
const SCORE_MATCH_WORD = 80;
const SCORE_MATCH_CAPITAL = 70;
const SCORE_MATCH_DOT = 60;

const OUT_OF_SCORE_SIZE = 1024;
const SCORE_BASE = 512 + 1;

const ScoreArray = Uint16Array;
const BonusArray = Uint8Array;
type ScoreArray = typeof ScoreArray.prototype;
type BonusArray = typeof BonusArray.prototype;

export function hasMatch(needle: string, haystack: string): boolean {
	const lowerNeedle = needle.toLowerCase();
	const lowerHaystack = haystack.toLowerCase();
	for (let i = 0, j = 0; i < lowerNeedle.length; i++) {
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

	if (m > OUT_OF_SCORE_SIZE) {
		// Unreasonably large candidate: return no score
		// If it is a valid match it will still be returned, it will
		// just be ranked below any reasonably sized candidates
		return SCORE_MIN;
	}

	const normalizedNeedle = needle.toLowerCase();
	const normalizedHaystack = haystack.toLowerCase();

	const matchBonuses = precomputeBonuses(haystack);

	const bestScores = new ScoreArray(m);
	const bestMatchScores = new ScoreArray(m);

	for (let i = 0; i < n; i++) {
		computeRow(
			i,
			n,
			m,
			normalizedNeedle,
			normalizedHaystack,
			matchBonuses,
			bestScores,
			bestMatchScores,
			bestScores,
			bestMatchScores,
		);
	}

	return bestScores[m - 1];
}

export function computeScoreWithPositions(
	needle: string,
	haystack: string,
	positions: { [x: number]: number },
): number {
	const n = needle.length;
	const m = haystack.length;

	if (!n || !m) return SCORE_MIN;

	if (n === m) {
		for (let i = 0; i < n; i++) {
			positions[i] = i + 1;
		}
		return SCORE_MAX;
	}

	if (m > OUT_OF_SCORE_SIZE) {
		return SCORE_MIN;
	}

	const normalizedNeedle = needle.toLowerCase();
	const normalizedHaystack = haystack.toLowerCase();

	const matchBonuses = precomputeBonuses(haystack);

	const bestScoreMatrix = createScoreMatrix(n, m);
	const bestMatchScoreMatrix = createScoreMatrix(n, m);

	computeRow(
		0,
		n,
		m,
		normalizedNeedle,
		normalizedHaystack,
		matchBonuses,
		bestScoreMatrix[0],
		bestMatchScoreMatrix[0],
		bestScoreMatrix[0],
		bestMatchScoreMatrix[0],
	);
	for (let i = 1; i < n; i++) {
		computeRow(
			i,
			n,
			m,
			normalizedNeedle,
			normalizedHaystack,
			matchBonuses,
			bestScoreMatrix[i],
			bestMatchScoreMatrix[i],
			bestScoreMatrix[i - 1],
			bestMatchScoreMatrix[i - 1],
		);
	}

	let isMatchRequired = false;
	for (let i = n - 1, j = m - 1; i >= 0; i--) {
		for (; j >= 0; j--) {
			// There may be multiple paths which result in
			// the optimal weight.
			//
			// For simplicity, we will pick the first one
			// we encounter, the latest in the candidate
			// string.
			if (
				bestMatchScoreMatrix[i][j] > SCORE_MIN &&
				(isMatchRequired ||
					bestMatchScoreMatrix[i][j] === bestScoreMatrix[i][j])
			) {
				// If this score was determined using
				// SCORE_MATCH_CONSECUTIVE, the
				// previous character MUST be a match
				isMatchRequired =
					i > 0 &&
					j > 0 &&
					bestScoreMatrix[i][j] ===
						bestMatchScoreMatrix[i - 1][j - 1] + SCORE_MATCH_CONSECUTIVE;
				positions[i] = 1 + j--;
				break;
			}
		}
	}

	return bestScoreMatrix[n - 1][m - 1];
}

function precomputeBonuses(haystack: string): BonusArray {
	// Which positions are beginning of words
	const matchBonuses = new BonusArray(haystack.length);

	let lastChar = "/";
	for (let i = 0; i < haystack.length; i++) {
		const ch = haystack[i];

		switch (lastChar) {
			case "/":
				matchBonuses[i] = SCORE_MATCH_SLASH;
				break;
			case "-":
			case "_":
			case " ":
				matchBonuses[i] = SCORE_MATCH_WORD;
				break;
			case ".":
				matchBonuses[i] = SCORE_MATCH_DOT;
				break;
			default:
				// Check camelCase
				if ("a" <= lastChar && lastChar <= "z" && "A" <= ch && ch <= "Z") {
					matchBonuses[i] = SCORE_MATCH_CAPITAL;
				} else {
					matchBonuses[i] = 0;
				}
		}

		lastChar = ch;
	}

	return matchBonuses;
}

function computeRow(
	i: number,
	n: number,
	m: number,
	normalizedNeedle: string,
	normalizedHaystack: string,
	matchBonuses: BonusArray,
	bestScores: ScoreArray,
	bestMatchScores: ScoreArray,
	lastBestScores: ScoreArray,
	lastBestMatchScores: ScoreArray,
) {
	const gapScore = i === n - 1 ? SCORE_GAP_TRAILING : SCORE_GAP_INNER;
	let prevScore = SCORE_MIN;

	let prevBestScore = 0;
	let prevBestMatchScore = 0;

	for (let j = 0; j < m; j++) {
		if (normalizedNeedle[i] === normalizedHaystack[j]) {
			let score = SCORE_MIN;
			if (i === 0) {
				score = j * SCORE_GAP_LEADING + matchBonuses[j] + SCORE_BASE;
			} else if (j > 0) {
				// i > 0 && j > 0
				score = Math.max(
					prevBestScore + matchBonuses[j],
					// consecutive match, doesn't stack with match_bonus
					prevBestMatchScore + SCORE_MATCH_CONSECUTIVE,
				);
			}
			prevBestMatchScore = lastBestMatchScores[j];
			bestMatchScores[j] = Math.min(
				Math.max(SCORE_MIN, Math.trunc(score)),
				SCORE_MAX,
			);
			prevScore = Math.max(score, prevScore + gapScore);
		} else {
			prevBestMatchScore = lastBestMatchScores[j];
			bestMatchScores[j] = SCORE_MIN;
			prevScore = prevScore + gapScore;
		}
		prevBestScore = lastBestScores[j];
		bestScores[j] = Math.min(
			Math.max(SCORE_MIN, Math.trunc(prevScore)),
			SCORE_MAX,
		);
	}
}

function createScoreMatrix(n: number, m: number): ScoreArray[] {
	const arr = new Array(n);
	for (let i = 0; i < n; i++) {
		arr[i] = new ScoreArray(m);
	}
	return arr;
}
