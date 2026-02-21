"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FunctionCatalogResponse, FunctionEntry } from "@/lib/types";

const CACHE_KEY = "wynntils-function-catalog:v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;

type CachedCatalog = {
    savedAt: number;
    data: FunctionCatalogResponse;
};

type FetchCatalogOptions = {
    force?: boolean;
    signal?: AbortSignal;
};

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
        Array.isArray(candidate.arguments)
    );
}

function isFunctionCatalogResponse(value: unknown): value is FunctionCatalogResponse {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<FunctionCatalogResponse>;

    return (
        Array.isArray(candidate.functions) &&
        candidate.functions.every((entry) => isFunctionEntry(entry)) &&
        typeof candidate.count === "number" &&
        typeof candidate.generatedAt === "string"
    );
}

function readCachedCatalog() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const cached = window.localStorage.getItem(CACHE_KEY);

        if (!cached) {
            return null;
        }

        const parsed = JSON.parse(cached) as CachedCatalog;

        if (!parsed?.savedAt || !isFunctionCatalogResponse(parsed?.data)) {
            window.localStorage.removeItem(CACHE_KEY);
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

    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore storage quota / privacy mode failures.
    }
}

function isCacheFresh(cached: CachedCatalog) {
    return Date.now() - cached.savedAt < CACHE_MAX_AGE_MS;
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Failed to load catalog";
}

export function useFunctionCatalog() {
    const [data, setData] = useState<FunctionCatalogResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(null);
    const [isUsingStaleData, setIsUsingStaleData] = useState(false);

    const fetchCatalog = useCallback(async ({ force = false, signal }: FetchCatalogOptions = {}) => {
        const cached = readCachedCatalog();

        if (!force && cached) {
            setData(cached.data);
            setCacheSavedAt(cached.savedAt);
            setIsLoading(false);
            setIsUsingStaleData(!isCacheFresh(cached));

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
                signal,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch function catalog (${response.status})`);
            }

            const payload = (await response.json()) as unknown;

            if (!isFunctionCatalogResponse(payload)) {
                throw new Error("Invalid function catalog payload received from server");
            }

            setData(payload);
            setError(null);
            setIsUsingStaleData(false);
            writeCachedCatalog(payload);
            setCacheSavedAt(Date.now());
        } catch (fetchError) {
            if (signal?.aborted) {
                return;
            }

            if (cached) {
                setError(`Using cached data: ${toErrorMessage(fetchError)}`);
                setIsUsingStaleData(true);
            } else {
                setError(toErrorMessage(fetchError));
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        void fetchCatalog({ signal: controller.signal });

        return () => {
            controller.abort();
        };
    }, [fetchCatalog]);

    return useMemo(
        () => ({
            data,
            error,
            isLoading,
            isRefreshing,
            isUsingStaleData,
            refresh: async () => fetchCatalog({ force: true }),
            cacheSavedAt,
        }),
        [cacheSavedAt, data, error, fetchCatalog, isLoading, isRefreshing, isUsingStaleData],
    );
}
