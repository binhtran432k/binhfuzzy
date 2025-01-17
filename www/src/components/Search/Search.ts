import { env } from "mini-van-plate/shared";
import type { Van } from "vanjs-core";
import { search } from "fuzzyradix/fuzzy";

const Search = () => {
	const { div, input, ul, li } = env.van.tags;

	const searchText = env.van.state("");
	const searchTime = env.van.state(0);
	const items = env.van.state<string[]>([]);

	let time: Timer | undefined;
	const handleInput = (e: Event) => {
		clearTimeout(time);
		time = setTimeout(() => {
			searchText.val = (e.target as HTMLInputElement).value;
		}, 300);
	};

	const matchedItems = env.van.derive(() => {
		const t1 = performance.now();
		const rt = search(searchText.val, items.val);
		const t2 = performance.now();
		searchTime.val = t2 - t1;
		return rt;
	});

	env.van.derive(async () => {
		if (typeof window !== "undefined") {
			const data = await fetch("data/test.json");
			const json = await data.json();
			items.val = json;
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
		() => ul(matchedItems.val.slice(0, 100).map((x) => li(x))),
	);
};

export function hydrateSearch(van: Van) {
	for (const el of Array.from(document.querySelectorAll(".search"))) {
		van.hydrate(el, (_dom) => Search());
	}
}

export default Search;
