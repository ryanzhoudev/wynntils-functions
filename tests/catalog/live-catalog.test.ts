import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateFunctionCatalogResponse } from "@/lib/function-catalog-validation";
import { getSemanticValidationDescriptors } from "@/lib/ide/browser-lsp/semantic-validation";
import type { FunctionCatalogResponse } from "@/lib/types";

const artifactPath = resolve(process.env.WYNNTILS_CATALOG_ARTIFACT ?? ".test-artifacts/function-catalog.json");
const payload = JSON.parse(await readFile(artifactPath, "utf8")) as unknown;

describe("live function catalog contract", () => {
    it("has a valid, internally consistent payload", () => {
        expect(validateFunctionCatalogResponse(payload)).toEqual([]);
    });

    it("still satisfies every hard-coded semantic constraint", () => {
        const catalog = payload as FunctionCatalogResponse;
        const failures: string[] = [];

        for (const descriptor of getSemanticValidationDescriptors()) {
            const fn = catalog.functions.find(
                (entry) => entry.name.toLowerCase() === descriptor.functionName.toLowerCase(),
            );

            if (!fn) {
                failures.push(`Missing overridden function '${descriptor.functionName}'.`);
                continue;
            }

            const argument = fn.arguments[descriptor.argumentIndex];

            if (!argument) {
                failures.push(`Missing argument ${descriptor.argumentIndex + 1} on '${descriptor.functionName}'.`);
                continue;
            }

            const expectedType = descriptor.kind === "allowedLiterals" ? "String" : "List";
            if (argument.type !== expectedType) {
                failures.push(
                    `'${descriptor.functionName}' argument ${descriptor.argumentIndex + 1} changed from ${expectedType} to ${argument.type}.`,
                );
            }

            if (descriptor.kind === "allowedLiterals") {
                for (const value of descriptor.values) {
                    if (!argument.description?.includes(value)) {
                        failures.push(
                            `'${descriptor.functionName}' argument ${descriptor.argumentIndex + 1} description no longer contains '${value}'.`,
                        );
                    }
                }
            }

            if (
                descriptor.kind === "listElements" &&
                !argument.description?.toLowerCase().includes(descriptor.elementType.toLowerCase())
            ) {
                failures.push(
                    `'${descriptor.functionName}' argument ${descriptor.argumentIndex + 1} description no longer identifies ${descriptor.elementType} elements.`,
                );
            }
        }

        const switchFunction = catalog.functions.find((entry) => entry.name === "switch_case");
        if (!switchFunction?.aliases.some((alias) => alias.toLowerCase() === "switch")) {
            failures.push("'switch_case' no longer exposes the 'switch' alias.");
        }

        expect(failures).toEqual([]);
    });
});
