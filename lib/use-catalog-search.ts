"use client";

import { useMemo, useState } from "react";
import {
    createSearchBlob,
    DEFAULT_SEARCH_SCOPE,
    matchesSearchBlob,
    normalizeQueryTokens,
    SEARCH_SCOPE_OPTIONS,
    type SearchScope,
} from "@/lib/search";
import type { FunctionEntry } from "@/lib/types";

type UseCatalogSearchOptions = {
    sortEntries?: (first: FunctionEntry, second: FunctionEntry) => number;
};

const EMPTY_FUNCTIONS: readonly FunctionEntry[] = [];

export function useCatalogSearch(entries: readonly FunctionEntry[] | undefined, options: UseCatalogSearchOptions = {}) {
    const catalogEntries = entries ?? EMPTY_FUNCTIONS;
    const [query, setQuery] = useState("");
    const [searchScope, setSearchScope] = useState<SearchScope>(DEFAULT_SEARCH_SCOPE);
    const queryTokens = useMemo(() => normalizeQueryTokens(query), [query]);

    const searchIndex = useMemo(() => {
        const sortedEntries = options.sortEntries ? [...catalogEntries].sort(options.sortEntries) : [...catalogEntries];
        return sortedEntries.map((entry) => ({ entry, searchBlob: createSearchBlob(entry, searchScope) }));
    }, [catalogEntries, options.sortEntries, searchScope]);

    const filteredFunctions = useMemo(
        () =>
            searchIndex
                .filter(({ searchBlob }) => matchesSearchBlob(searchBlob, queryTokens))
                .map(({ entry }) => entry),
        [queryTokens, searchIndex],
    );

    const activeFilterCount = useMemo(() => Object.values(searchScope).filter(Boolean).length, [searchScope]);
    const isDefaultSearchScope = useMemo(
        () => SEARCH_SCOPE_OPTIONS.every(({ key }) => searchScope[key] === DEFAULT_SEARCH_SCOPE[key]),
        [searchScope],
    );

    return {
        query,
        setQuery,
        searchScope,
        setSearchScope,
        filteredFunctions,
        activeFilterCount,
        isDefaultSearchScope,
        resetSearch() {
            setSearchScope(DEFAULT_SEARCH_SCOPE);
            setQuery("");
        },
    };
}
