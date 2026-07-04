import type { FunctionArgument, FunctionCatalogResponse, FunctionEntry } from "@/lib/types";
import { normalizeFunctionLookupName } from "@/lib/function-names";

function validateFunctionArgument(value: unknown, path: string): string[] {
    if (typeof value !== "object" || value === null) {
        return [`${path} must be an object.`];
    }

    const candidate = value as Partial<FunctionArgument>;
    const errors: string[] = [];

    if (typeof candidate.id !== "number") errors.push(`${path}.id must be a number.`);
    if (typeof candidate.name !== "string") errors.push(`${path}.name must be a string.`);
    if (typeof candidate.description !== "string" && candidate.description !== null) {
        errors.push(`${path}.description must be a string or null.`);
    }
    if (typeof candidate.required !== "boolean") errors.push(`${path}.required must be a boolean.`);
    if (typeof candidate.type !== "string") errors.push(`${path}.type must be a string.`);
    if (typeof candidate.defaultValue !== "string" && candidate.defaultValue !== null) {
        errors.push(`${path}.defaultValue must be a string or null.`);
    }

    return errors;
}

function validateFunctionEntry(value: unknown, path: string): string[] {
    if (typeof value !== "object" || value === null) {
        return [`${path} must be an object.`];
    }

    const candidate = value as Partial<FunctionEntry>;
    const errors: string[] = [];

    if (typeof candidate.id !== "number") errors.push(`${path}.id must be a number.`);
    if (typeof candidate.name !== "string") errors.push(`${path}.name must be a string.`);
    if (typeof candidate.description !== "string") errors.push(`${path}.description must be a string.`);
    if (!Array.isArray(candidate.aliases)) {
        errors.push(`${path}.aliases must be an array.`);
    } else {
        candidate.aliases.forEach((alias, index) => {
            if (typeof alias !== "string") errors.push(`${path}.aliases[${index}] must be a string.`);
        });
    }
    if (typeof candidate.returnType !== "string") errors.push(`${path}.returnType must be a string.`);
    if (!Array.isArray(candidate.arguments)) {
        errors.push(`${path}.arguments must be an array.`);
    } else {
        candidate.arguments.forEach((argument, index) => {
            errors.push(...validateFunctionArgument(argument, `${path}.arguments[${index}]`));
        });
    }

    return errors;
}

export function validateFunctionCatalogResponse(value: unknown): string[] {
    if (typeof value !== "object" || value === null) {
        return ["Catalog payload must be an object."];
    }

    const candidate = value as Partial<FunctionCatalogResponse>;
    const errors: string[] = [];
    let functionsAreValid = false;

    if (!Array.isArray(candidate.functions)) {
        errors.push("Catalog functions must be an array.");
    } else {
        const functionErrors: string[] = [];
        candidate.functions.forEach((entry, index) => {
            functionErrors.push(...validateFunctionEntry(entry, `Catalog functions[${index}]`));
        });
        errors.push(...functionErrors);
        functionsAreValid = functionErrors.length === 0;
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

    if (Array.isArray(candidate.functions) && functionsAreValid) {
        const owners = new Map<string, string>();

        for (const fn of candidate.functions as FunctionEntry[]) {
            for (const lookupName of [fn.name, ...fn.aliases]) {
                const normalized = normalizeFunctionLookupName(lookupName);
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
