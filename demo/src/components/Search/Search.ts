import {
	type BonusArray,
	checkMatch,
	computeBonusesSimple,
	computeScore,
	computeScoreWithPositions,
	normalizeTextSimple,
} from "binhfuzzy";
import { env } from "mini-van-plate/shared";
import type { Van } from "vanjs-core";

const PositionArray = Uint16Array;
type PositionArray = typeof PositionArray.prototype;

const Search = () => {
	const { div, input, ul, li, b } = env.van.tags;

	const searchText = env.van.state("");
	const searchTime = env.van.state(0);
	const searchData = env.van.state<{
		haystacks: string[];
		normalizedHaystacks: string[];
		bonusesList: BonusArray[];
	} | null>(null);

	let time: Timer | undefined;
	const handleInput = (e: Event) => {
		clearTimeout(time);
		time = setTimeout(() => {
			searchText.val = (e.target as HTMLInputElement).value;
		}, 300);
	};

	const matchedItems = env.van.derive<[splits: string[], score: number][]>(
		() => {
			const searchDataVal = searchData.val;
			if (searchDataVal) {
				const t1 = performance.now();
				const normalizedNeedle = normalizeTextSimple(searchText.val);
				const allMatches = [...new Array(searchDataVal.haystacks.length)]
					.map((_, i) => i)
					.filter((i) =>
						checkMatch(normalizedNeedle, searchDataVal.normalizedHaystacks[i]),
					)
					.map((i) => {
						return [
							i,
							computeScore(
								normalizedNeedle,
								searchDataVal.normalizedHaystacks[i],
								searchDataVal.bonusesList[i],
							),
						] as [number, number];
					})
					.sort(([, a], [, b]) => b - a);
				const matches = allMatches
					.slice(0, 1e2)
					.map(([i]) => {
						const positions = new PositionArray(normalizedNeedle.length);
						const score = computeScoreWithPositions(
							normalizedNeedle,
							searchDataVal.normalizedHaystacks[i],
							searchDataVal.bonusesList[i],
							positions,
						);
						return [
							splitByPositions(searchDataVal.haystacks[i], positions),
							score,
						] as [string[], number];
					})
					.concat(
						allMatches
							.slice(1e2)
							.map(
								([i, score]) =>
									[[searchDataVal.haystacks[i]], score] as [string[], number],
							),
					);
				const t2 = performance.now();
				searchTime.val = t2 - t1;
				return matches;
			}
			return [];
		},
	);

	env.van.derive(async () => {
		if (typeof window !== "undefined") {
			const data = await fetch("data/test.json");
			const json = await data.json();
			const searchs: string[] = json;
			searchData.val = {
				haystacks: searchs,
				normalizedHaystacks: searchs.map(normalizeTextSimple),
				bonusesList: searchs.map(computeBonusesSimple),
			};
		}
	});

	return div(
		{ class: "search" },
		input({
			type: "search",
			placeholder: "Search",
			oninput: handleInput,
		}),
		div(searchText),
		() => div(`Matched ${matchedItems.val.length} in ${searchTime.val}ms`),
		() =>
			ul(
				matchedItems.val
					.slice(0, 1e3)
					.map(([splits, c]) =>
						li(
							`${c} - `,
							...splits.map((x, i) => (i % 2 === 1 ? b(x) : x)).filter(Boolean),
						),
					),
			),
	);
};

export function hydrateSearch(van: Van) {
	for (const el of Array.from(document.querySelectorAll(".search"))) {
		van.hydrate(el, (_dom) => Search());
	}
}

function splitByPositions(
	haystack: string,
	positions: PositionArray,
): string[] {
	if (positions.length === 0 || positions[0] === 0) return [haystack];
	const splitMatches: string[] = [haystack.slice(0, positions[0] - 1)];
	let lastPos = positions[0];
	for (let i = 1; i < positions.length; i++) {
		if (positions[i] > positions[i - 1] + 1) {
			splitMatches.push(haystack.slice(lastPos - 1, positions[i - 1]));
			splitMatches.push(haystack.slice(positions[i - 1], positions[i] - 1));
			lastPos = positions[i];
		}
	}
	if (positions.length > 0) {
		splitMatches.push(
			haystack.slice(lastPos - 1, positions[positions.length - 1]),
		);
		splitMatches.push(haystack.slice(positions[positions.length - 1]));
	}
	return splitMatches;
}

export default Search;
