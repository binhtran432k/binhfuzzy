import { main as mainBinhVan } from "binhvan";

const pageImports: string[] = ["~/pages/PMain/PMain.js"];

async function main() {
	await mainBinhVan({
		watchDirs: ["src"],
		pageModules: await Promise.all(pageImports.map((x) => import(x))),
	});
}

if (import.meta.main) {
	main();
}
