export type NormalizeAliasesOptions = {
    splitCommaSeparated?: boolean;
    deduplicate?: boolean;
};

export function normalizeFunctionLookupName(name: string) {
    return name.trim().toLowerCase();
}

export function normalizeFunctionAliases(
    aliases: readonly string[] | undefined,
    { splitCommaSeparated = false, deduplicate = false }: NormalizeAliasesOptions = {},
) {
    if (!aliases) {
        return [];
    }

    const normalized = aliases
        .flatMap((alias) => (splitCommaSeparated ? alias.split(",") : alias))
        .map((alias) => alias.trim())
        .filter(Boolean);

    return deduplicate ? Array.from(new Set(normalized)) : normalized;
}
