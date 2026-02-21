"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FunctionCatalogResponse, FunctionEntry } from "@/lib/types";

const CACHE_KEY = "wynntils-function-catalog:v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;

const REFRESH_RATE_LIMIT_KEY = "wynntils-function-catalog:refresh-attempts:v1";
const REFRESH_RATE_LIMIT_MAX_ATTEMPTS = 5;
const REFRESH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;

type CachedCatalog = {
    savedAt: number;
    data: FunctionCatalogResponse;
};

type RefreshRateLimitStatus = {
    isLimited: boolean;
    remaining: number;
    nextAllowedAt: number | null;
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

function readRefreshAttempts() {
    if (typeof window === "undefined") {
        return [] as number[];
    }

    try {
        const raw = window.localStorage.getItem(REFRESH_RATE_LIMIT_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            window.localStorage.removeItem(REFRESH_RATE_LIMIT_KEY);
            return [];
        }

        return parsed.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    } catch {
        return [];
    }
}

function writeRefreshAttempts(attempts: number[]) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(REFRESH_RATE_LIMIT_KEY, JSON.stringify(attempts));
    } catch {
        // Ignore localStorage failures.
    }
}

function pruneRefreshAttempts(attempts: number[], now = Date.now()) {
    return attempts.filter((timestamp) => now - timestamp < REFRESH_RATE_LIMIT_WINDOW_MS);
}

function getRefreshRateLimitStatus(now = Date.now()): RefreshRateLimitStatus {
    const attempts = pruneRefreshAttempts(readRefreshAttempts(), now);
    writeRefreshAttempts(attempts);

    if (attempts.length < REFRESH_RATE_LIMIT_MAX_ATTEMPTS) {
        return {
            isLimited: false,
            remaining: REFRESH_RATE_LIMIT_MAX_ATTEMPTS - attempts.length,
            nextAllowedAt: null,
        };
    }

    const oldestAttempt = attempts[0];

    return {
        isLimited: true,
        remaining: 0,
        nextAllowedAt: oldestAttempt + REFRESH_RATE_LIMIT_WINDOW_MS,
    };
}

function reserveRefreshAttempt(now = Date.now()): RefreshRateLimitStatus {
    const attempts = pruneRefreshAttempts(readRefreshAttempts(), now);

    if (attempts.length >= REFRESH_RATE_LIMIT_MAX_ATTEMPTS) {
        return {
            isLimited: true,
            remaining: 0,
            nextAllowedAt: attempts[0] + REFRESH_RATE_LIMIT_WINDOW_MS,
        };
    }

    attempts.push(now);
    writeRefreshAttempts(attempts);

    return {
        isLimited: false,
        remaining: REFRESH_RATE_LIMIT_MAX_ATTEMPTS - attempts.length,
        nextAllowedAt: null,
    };
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
    const [refreshRateLimit, setRefreshRateLimit] = useState<RefreshRateLimitStatus>(() =>
        getRefreshRateLimitStatus(),
    );

    const fetchCatalog = useCallback(async ({ force = false, signal }: FetchCatalogOptions = {}) => {
        let didSucceed = false;

        if (force) {
            const rateLimitStatus = reserveRefreshAttempt();
            setRefreshRateLimit(rateLimitStatus);

            if (rateLimitStatus.isLimited) {
                setError("Refresh rate limit reached (5 refreshes per 15 minutes).");
                return false;
            }
        }

        const cached = readCachedCatalog();

        if (!force && cached) {
            setData(cached.data);
            setCacheSavedAt(cached.savedAt);
            setIsLoading(false);
            setIsUsingStaleData(!isCacheFresh(cached));

            if (isCacheFresh(cached)) {
                return true;
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
            didSucceed = true;
        } catch (fetchError) {
            if (signal?.aborted) {
                return false;
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
            setRefreshRateLimit(getRefreshRateLimitStatus());
        }

        return didSucceed;
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        void fetchCatalog({ signal: controller.signal });

        return () => {
            controller.abort();
        };
    }, [fetchCatalog]);

    useEffect(() => {
        const syncRateLimitStatus = () => {
            setRefreshRateLimit(getRefreshRateLimitStatus());
        };

        syncRateLimitStatus();

        const intervalId = window.setInterval(syncRateLimitStatus, 10_000);

        const onStorage = (event: StorageEvent) => {
            if (event.key === REFRESH_RATE_LIMIT_KEY) {
                syncRateLimitStatus();
            }
        };

        window.addEventListener("storage", onStorage);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    return useMemo(
        () => ({
            data,
            error,
            isLoading,
            isRefreshing,
            isUsingStaleData,
            refreshRateLimit,
            refresh: async () => fetchCatalog({ force: true }),
            cacheSavedAt,
        }),
        [cacheSavedAt, data, error, fetchCatalog, isLoading, isRefreshing, isUsingStaleData, refreshRateLimit],
    );
}
