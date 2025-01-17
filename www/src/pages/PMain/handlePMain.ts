import { registerEnv } from "mini-van-plate/shared";
import van from "vanjs-core";

import { hydrateSearch } from "~/components/Search/Search.js";

function main() {
	registerEnv({ van });
	hydrateSearch(van);
}

main();
