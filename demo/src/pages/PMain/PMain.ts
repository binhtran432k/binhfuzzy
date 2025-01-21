import type { BinhVanPageFn } from "binhvan";
import { LBinhVan } from "binhvan/layouts";
import Search from "~/components/Search/Search";

const PMain: BinhVanPageFn = (van) => {
	return [
		{
			pathname: "index.html",
			content: LBinhVan(
				van,
				{
					headProps: { title: "Fuzzy Radix" },
					moduleJsImports: ["~/pages/PMain/handlePMain.js"],
				},
				Search(),
			),
		},
	];
};

export default PMain;
