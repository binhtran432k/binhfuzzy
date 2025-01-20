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
const SCORE_BASE = 512;

const ScoreArray = Uint16Array;
const BonusArray = Uint8Array;
type ScoreArray = typeof ScoreArray.prototype;
type BonusArray = typeof BonusArray.prototype;

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

	if (m > OUT_OF_SCORE_SIZE) {
		// Unreasonably large candidate: return no score
		// If it is a valid match it will still be returned, it will
		// just be ranked below any reasonably sized candidates
		return SCORE_MIN;
	}

	return _computeScore(n, m, needle, haystack);
}

function precomputeBonuses(haystack: string): BonusArray {
	// Which positions are beginning of words
	const matchBonuses = new BonusArray(haystack.length);

	let lastChar = "/";
	let lastIsUpper = true;
	for (let i = 0; i < haystack.length; i++) {
		const ch = haystack[i];
		const isUpper = ch.toUpperCase() === ch;

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
				if (!lastIsUpper && isUpper) {
					matchBonuses[i] = SCORE_MATCH_CAPITAL;
				} else {
					matchBonuses[i] = 0;
				}
		}

		lastChar = ch;
		lastIsUpper = isUpper;
	}

	return matchBonuses;
}

function _computeScore(
	n: number,
	m: number,
	needle: string,
	haystack: string,
): number {
	const normalizedNeedle = needle.toLowerCase();
	const normalizedHaystack = haystack.toLowerCase();

	const matchBonuses = precomputeBonuses(haystack);

	const bestScores = new ScoreArray(m);
	const bestMatchScores = new ScoreArray(m);

	for (let i = 0; i < n; i++) {
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
				prevBestMatchScore = bestMatchScores[j];
				bestMatchScores[j] = Math.min(
					Math.max(SCORE_MIN, Math.trunc(score)),
					SCORE_MAX,
				);
				prevScore = Math.max(score, prevScore + gapScore);
			} else {
				prevBestMatchScore = bestMatchScores[j];
				bestMatchScores[j] = SCORE_MIN;
				prevScore = prevScore + gapScore;
			}
			prevBestScore = bestScores[j];
			bestScores[j] = Math.min(
				Math.max(SCORE_MIN, Math.trunc(prevScore)),
				SCORE_MAX,
			);
		}
	}

	return bestScores[m - 1];
}
