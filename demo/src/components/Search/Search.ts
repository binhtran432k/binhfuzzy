import { computeScore, computeScoreWithPositions, hasMatch } from "binhfuzzy";
import { env } from "mini-van-plate/shared";
import type { Van } from "vanjs-core";

const PositionArray = Uint16Array;
type PositionArray = typeof PositionArray.prototype;

const Search = () => {
	const { div, input, ul, li, b } = env.van.tags;

	const searchText = env.van.state("");
	const searchTime = env.van.state(0);
	const searchData = env.van.state<string[]>([]);

	let time: Timer | undefined;
	const handleInput = (e: Event) => {
		clearTimeout(time);
		time = setTimeout(() => {
			searchText.val = (e.target as HTMLInputElement).value;
		}, 300);
	};

	const matchedItems = env.van.derive<[splits: string[], score: number][]>(
		() => {
			if (searchData.val) {
				const t1 = performance.now();
				const allMatches = searchData.val
					.filter((x) => hasMatch(searchText.val, x))
					.map((haystack) => {
						return [haystack, computeScore(searchText.val, haystack)] as [
							string,
							number,
						];
					})
					.sort(([, a], [, b]) => b - a);
				const matches = allMatches
					.slice(0, 1e3)
					.map(([haystack]) => {
						const positions = new PositionArray(searchText.val.length);
						const score = computeScoreWithPositions(
							searchText.val,
							haystack,
							positions,
						);
						return [splitByPositions(haystack, positions), score] as [
							string[],
							number,
						];
					})
					.concat(
						allMatches
							.slice(1e3)
							.map(
								([haystack, score]) =>
									[[haystack], score] as [string[], number],
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
			searchData.val = searchs;
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
