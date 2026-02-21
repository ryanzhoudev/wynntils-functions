"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FunctionCatalogResponse } from "@/lib/types";

const CACHE_KEY = "wynntils-function-catalog:v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;

type CachedCatalog = {
    savedAt: number;
    data: FunctionCatalogResponse;
};

function readCachedCatalog() {
    if (typeof window === "undefined") {
        return null;
    }

    const cached = window.localStorage.getItem(CACHE_KEY);

    if (!cached) {
        return null;
    }

    try {
        const parsed = JSON.parse(cached) as CachedCatalog;

        if (!parsed?.savedAt || !parsed?.data) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function writeCachedCatalog(data: FunctionCatalogResponse) {
    if (typeof window === "undefined") {
        return;
    }

    const payload: CachedCatalog = {
        savedAt: Date.now(),
        data,
    };

    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function isCacheFresh(cached: CachedCatalog) {
    return Date.now() - cached.savedAt < CACHE_MAX_AGE_MS;
}

export function useFunctionCatalog() {
    const [data, setData] = useState<FunctionCatalogResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(null);

    const fetchCatalog = useCallback(async (force: boolean = false) => {
        const cached = readCachedCatalog();

        if (!force && cached) {
            setData(cached.data);
            setCacheSavedAt(cached.savedAt);
            setIsLoading(false);

            if (isCacheFresh(cached)) {
                return;
            }
        }

        if (!cached) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const response = await fetch("/api/functions", {
                method: "GET",
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch function catalog (${response.status})`);
            }

            const payload = (await response.json()) as FunctionCatalogResponse;

            setData(payload);
            setError(null);
            writeCachedCatalog(payload);
            setCacheSavedAt(Date.now());
        } catch (fetchError) {
            if (!cached) {
                setError(fetchError instanceof Error ? fetchError.message : "Failed to load catalog");
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchCatalog();
    }, [fetchCatalog]);

    return useMemo(
        () => ({
            data,
            error,
            isLoading,
            isRefreshing,
            refresh: () => fetchCatalog(true),
            cacheSavedAt,
        }),
        [cacheSavedAt, data, error, fetchCatalog, isLoading, isRefreshing],
    );
}
