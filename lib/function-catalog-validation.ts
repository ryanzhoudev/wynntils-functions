import type { FunctionArgument, FunctionCatalogResponse, FunctionEntry } from "@/lib/types";

function isFunctionArgument(value: unknown): value is FunctionArgument {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<FunctionArgument>;

    return (
        typeof candidate.id === "number" &&
        typeof candidate.name === "string" &&
        (typeof candidate.description === "string" || candidate.description === null) &&
        typeof candidate.required === "boolean" &&
        typeof candidate.type === "string" &&
        (typeof candidate.defaultValue === "string" || candidate.defaultValue === null)
    );
}

function isFunctionEntry(value: unknown): value is FunctionEntry {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<FunctionEntry>;

    return (
        typeof candidate.id === "number" &&
        typeof candidate.name === "string" &&
        typeof candidate.description === "string" &&
        Array.isArray(candidate.aliases) &&
        candidate.aliases.every((alias) => typeof alias === "string") &&
        typeof candidate.returnType === "string" &&
        Array.isArray(candidate.arguments) &&
        candidate.arguments.every(isFunctionArgument)
    );
}

export function validateFunctionCatalogResponse(value: unknown): string[] {
    if (typeof value !== "object" || value === null) {
        return ["Catalog payload must be an object."];
    }

    const candidate = value as Partial<FunctionCatalogResponse>;
    const errors: string[] = [];

    if (!Array.isArray(candidate.functions)) {
        errors.push("Catalog functions must be an array.");
    } else {
        candidate.functions.forEach((entry, index) => {
            if (!isFunctionEntry(entry)) {
                errors.push(`Catalog function at index ${index} has an invalid shape.`);
            }
        });
    }

    if (typeof candidate.count !== "number") {
        errors.push("Catalog count must be a number.");
    } else if (Array.isArray(candidate.functions) && candidate.count !== candidate.functions.length) {
        errors.push(`Catalog count ${candidate.count} does not match functions length ${candidate.functions.length}.`);
    }

    if (typeof candidate.dataVersion !== "string" && candidate.dataVersion !== null) {
        errors.push("Catalog dataVersion must be a string or null.");
    }

    if (typeof candidate.harvestedAt !== "number" && candidate.harvestedAt !== null) {
        errors.push("Catalog harvestedAt must be a number or null.");
    }

    if (Array.isArray(candidate.functions) && candidate.functions.every(isFunctionEntry)) {
        const owners = new Map<string, string>();

        for (const fn of candidate.functions) {
            for (const lookupName of [fn.name, ...fn.aliases]) {
                const normalized = lookupName.trim().toLowerCase();
                const owner = owners.get(normalized);

                if (!normalized) {
                    errors.push(`Function '${fn.name}' contains an empty name or alias.`);
                } else if (owner && owner !== fn.name) {
                    errors.push(`Function lookup name '${lookupName}' is shared by '${owner}' and '${fn.name}'.`);
                } else {
                    owners.set(normalized, fn.name);
                }
            }
        }
    }

    return errors;
}

export function isFunctionCatalogResponse(value: unknown): value is FunctionCatalogResponse {
    return validateFunctionCatalogResponse(value).length === 0;
}
