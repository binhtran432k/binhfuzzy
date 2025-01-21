import { getMacroValue } from "./index.macro" with { type: "macro" };

export const SCORE_MIN: number = getMacroValue("ScoreMin");
export const SCORE_MAX: number = getMacroValue("ScoreMax");

export const SCORE_MATCH_CONSECUTIVE: number = getMacroValue(
	"ScoreMatchConsecutive",
);
export const SCORE_MATCH_SLASH: number = getMacroValue("ScoreMatchSlash");
export const SCORE_MATCH_WORD: number = getMacroValue("ScoreMatchWord");
export const SCORE_MATCH_CAPITAL: number = getMacroValue("ScoreMatchCapital");
export const SCORE_MATCH_DOT: number = getMacroValue("ScoreMatchDot");

export const ScoreArray: Uint16ArrayConstructor = Uint16Array;
export const BonusArray: Uint8ArrayConstructor = Uint8Array;
export type ScoreArray = typeof ScoreArray.prototype;
export type BonusArray = typeof BonusArray.prototype;

export function checkMatch(
	normalizedNeedle: string,
	normalizedHaystack: string,
): boolean {
	for (let i = 0, j = 0; i < normalizedNeedle.length; i++) {
		j = normalizedHaystack.indexOf(normalizedNeedle[i], j) + 1;
		if (j === 0) return false;
	}
	return true;
}

export function computeScore(
	normalizedNeedle: string,
	normalizedHaystack: string,
	matchBonuses: BonusArray,
): number {
	const n = normalizedNeedle.length;
	const m = normalizedHaystack.length;

	if (!n || !m) return SCORE_MIN;

	if (n === m) {
		// Since this method can only be called with a haystack which
		// matches needle. If the lengths of the strings are equal the
		// strings themselves must also be equal (ignoring case).
		return SCORE_MAX;
	}

	if (m > getMacroValue("BoundOutOfScore")) {
		// Unreasonably large candidate: return no score
		// If it is a valid match it will still be returned, it will
		// just be ranked below any reasonably sized candidates
		return SCORE_MIN;
	}

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
	normalizedNeedle: string,
	normalizedHaystack: string,
	matchBonuses: BonusArray,
	positions: { [x: number]: number },
): number {
	const n = normalizedNeedle.length;
	const m = normalizedHaystack.length;

	if (!n || !m) return SCORE_MIN;

	if (n === m) {
		for (let i = 0; i < n; i++) {
			positions[i] = 1 + i;
		}
		return SCORE_MAX;
	}

	if (m > getMacroValue("BoundOutOfScore")) {
		return SCORE_MIN;
	}

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

export function normalizeTextSimple(text: string): string {
	return text.toLowerCase();
}

export function computeBonusesSimple(haystack: string): BonusArray {
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
	const gapScore =
		i === n - 1
			? getMacroValue("ScoreGapTrailing")
			: getMacroValue("ScoreGapInner");
	let prevScore = SCORE_MIN;

	let prevBestScore = 0;
	let prevBestMatchScore = 0;

	for (let j = 0; j < m; j++) {
		if (normalizedNeedle[i] === normalizedHaystack[j]) {
			let score = SCORE_MIN;
			if (i === 0) {
				score =
					j * getMacroValue("ScoreGapLeading") +
					matchBonuses[j] +
					getMacroValue("ScoreBase");
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
