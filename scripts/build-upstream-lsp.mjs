#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, "vendor/wynntils-functions-tools/server/src");
const outputRoot = resolve(projectRoot, ".generated/upstream-lsp");

function walk(dir, entries = []) {
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
            walk(fullPath, entries);
        } else {
            entries.push(fullPath);
        }
    }

    return entries;
}

if (!existsSync(sourceRoot)) {
    console.error("Upstream source is missing at vendor/wynntils-functions-tools/server/src");
    process.exit(1);
}

rmSync(outputRoot, { recursive: true, force: true });

const compileResult = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.upstream-lsp.json"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
});

if (compileResult.status !== 0) {
    process.exit(compileResult.status ?? 1);
}

const jsonFiles = walk(sourceRoot).filter((filePath) => filePath.endsWith(".json"));

for (const sourceFile of jsonFiles) {
    const outputFile = join(outputRoot, relative(sourceRoot, sourceFile));
    mkdirSync(dirname(outputFile), { recursive: true });
    copyFileSync(sourceFile, outputFile);
}

console.log(`Built upstream LSP server to ${outputRoot}`);
