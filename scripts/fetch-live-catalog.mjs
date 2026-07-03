import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const endpoint = process.env.WYNNTILS_CATALOG_URL ?? "https://wynntils-functions.ryanzhou.dev/api/functions";
const outputPath = resolve(process.env.WYNNTILS_CATALOG_ARTIFACT ?? ".test-artifacts/function-catalog.json");

const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
    throw new Error(`Catalog request failed with HTTP ${response.status} from ${endpoint}`);
}

const payload = await response.text();
JSON.parse(payload);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${payload}\n`, "utf8");
console.log(`Saved live catalog from ${endpoint} to ${outputPath}`);
