import { FunctionEntry } from "@/lib/types";

export type SearchScope = {
    functionNames: boolean;
    functionDescriptions: boolean;
    functionReturnTypes: boolean;
    argumentNames: boolean;
    argumentDescriptions: boolean;
};

export type SearchScopeOption = {
    key: keyof SearchScope;
    label: string;
};

export const SEARCH_SCOPE_OPTIONS: SearchScopeOption[] = [
    { key: "functionNames", label: "Function names & aliases" },
    { key: "functionDescriptions", label: "Function descriptions" },
    { key: "functionReturnTypes", label: "Return types" },
    { key: "argumentNames", label: "Argument names" },
    { key: "argumentDescriptions", label: "Argument descriptions" },
];

export const DEFAULT_SEARCH_SCOPE: SearchScope = {
    functionNames: true,
    functionDescriptions: true,
    functionReturnTypes: false,
    argumentNames: false,
    argumentDescriptions: false,
};

export function normalizeQueryTokens(query: string) {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function createSearchBlob(entry: FunctionEntry, scope: SearchScope) {
    const parts: string[] = [];

    if (scope.functionNames) {
        parts.push(entry.name, ...entry.aliases);
    }

    if (scope.functionDescriptions) {
        parts.push(entry.description);
    }

    if (scope.functionReturnTypes) {
        parts.push(entry.returnType);
    }

    if (scope.argumentNames) {
        parts.push(...entry.arguments.map((argument) => argument.name));
    }

    if (scope.argumentDescriptions) {
        parts.push(...entry.arguments.map((argument) => argument.description ?? ""));
    }

    return parts.join(" ").toLowerCase();
}

export function matchesQuery(entry: FunctionEntry, scope: SearchScope, queryTokens: string[]) {
    if (queryTokens.length === 0) {
        return true;
    }

    const searchBlob = createSearchBlob(entry, scope);

    return queryTokens.every((token) => searchBlob.includes(token));
}
