"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY,
    type RefreshRateLimitStatus,
    getRefreshRateLimitStatus,
    isCatalogCacheFresh,
    readCachedCatalog,
    reserveRefreshAttempt,
    writeCachedCatalog,
} from "@/lib/function-catalog-cache";
import { isFunctionCatalogResponse } from "@/lib/function-catalog-validation";
import { FunctionCatalogResponse } from "@/lib/types";

type FetchCatalogOptions = {
    force?: boolean;
    signal?: AbortSignal;
};

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Failed to load catalog";
}

export function useFunctionCatalog() {
    const inFlightRequestRef = useRef<Promise<boolean> | null>(null);
    const [data, setData] = useState<FunctionCatalogResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(null);
    const [isUsingStaleData, setIsUsingStaleData] = useState(false);
    const [refreshRateLimit, setRefreshRateLimit] = useState<RefreshRateLimitStatus>(() => getRefreshRateLimitStatus());

    const runCatalogFetch = useCallback(async ({ force = false, signal }: FetchCatalogOptions = {}) => {
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
            const isFresh = isCatalogCacheFresh(cached);
            setIsUsingStaleData(!isFresh);

            if (isFresh) {
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
            const cachedPayload = writeCachedCatalog(payload);
            setCacheSavedAt(cachedPayload.savedAt);
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

    const fetchCatalog = useCallback(
        (options: FetchCatalogOptions = {}) => {
            if (inFlightRequestRef.current) {
                return inFlightRequestRef.current;
            }

            const request = runCatalogFetch(options).finally(() => {
                if (inFlightRequestRef.current === request) {
                    inFlightRequestRef.current = null;
                }
            });
            inFlightRequestRef.current = request;
            return request;
        },
        [runCatalogFetch],
    );

    useEffect(() => {
        const controller = new AbortController();

        window.queueMicrotask(() => {
            void fetchCatalog({ signal: controller.signal });
        });

        return () => {
            controller.abort();
        };
    }, [fetchCatalog]);

    useEffect(() => {
        const syncRateLimitStatus = () => {
            setRefreshRateLimit(getRefreshRateLimitStatus());
        };

        syncRateLimitStatus();

        const delay = refreshRateLimit.nextChangeAt
            ? Math.max(refreshRateLimit.nextChangeAt - Date.now() + 50, 0)
            : null;
        const timeoutId = delay === null ? null : window.setTimeout(syncRateLimitStatus, delay);

        const onStorage = (event: StorageEvent) => {
            if (event.key === FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY) {
                syncRateLimitStatus();
            }
        };

        window.addEventListener("storage", onStorage);

        return () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            window.removeEventListener("storage", onStorage);
        };
    }, [refreshRateLimit.nextChangeAt]);

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
