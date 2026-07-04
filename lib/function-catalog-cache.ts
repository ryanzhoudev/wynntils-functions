import { isFunctionCatalogResponse } from "@/lib/function-catalog-validation";
import type { FunctionCatalogResponse } from "@/lib/types";

export const FUNCTION_CATALOG_CACHE_KEY = "wynntils-function-catalog:v1";
export const FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY = "wynntils-function-catalog:refresh-attempts:v1";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const REFRESH_RATE_LIMIT_MAX_ATTEMPTS = 5;
const REFRESH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;

export type CachedCatalog = {
    savedAt: number;
    data: FunctionCatalogResponse;
};

export type RefreshRateLimitStatus = {
    isLimited: boolean;
    remaining: number;
    nextAllowedAt: number | null;
    nextChangeAt: number | null;
};

function hasWindow() {
    return typeof window !== "undefined";
}

export function readCachedCatalog(): CachedCatalog | null {
    if (!hasWindow()) {
        return null;
    }

    try {
        const cached = window.localStorage.getItem(FUNCTION_CATALOG_CACHE_KEY);

        if (!cached) {
            return null;
        }

        const parsed = JSON.parse(cached) as Partial<CachedCatalog>;

        if (
            typeof parsed.savedAt !== "number" ||
            !Number.isFinite(parsed.savedAt) ||
            !isFunctionCatalogResponse(parsed.data)
        ) {
            window.localStorage.removeItem(FUNCTION_CATALOG_CACHE_KEY);
            return null;
        }

        return parsed as CachedCatalog;
    } catch {
        return null;
    }
}

export function writeCachedCatalog(data: FunctionCatalogResponse): CachedCatalog {
    const payload = { savedAt: Date.now(), data };

    if (hasWindow()) {
        try {
            window.localStorage.setItem(FUNCTION_CATALOG_CACHE_KEY, JSON.stringify(payload));
        } catch {
            // Storage may be unavailable in privacy mode or over quota.
        }
    }

    return payload;
}

function readRefreshAttempts() {
    if (!hasWindow()) {
        return [] as number[];
    }

    try {
        const raw = window.localStorage.getItem(FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            window.localStorage.removeItem(FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY);
            return [];
        }

        return parsed.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    } catch {
        return [];
    }
}

function writeRefreshAttempts(attempts: number[]) {
    if (!hasWindow()) {
        return;
    }

    try {
        window.localStorage.setItem(FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
        // Storage may be unavailable in privacy mode or over quota.
    }
}

function activeRefreshAttempts(now: number) {
    const attempts = readRefreshAttempts();
    const active = attempts.filter((timestamp) => now - timestamp < REFRESH_RATE_LIMIT_WINDOW_MS);

    if (active.length !== attempts.length) {
        writeRefreshAttempts(active);
    }

    return active;
}

function statusForAttempts(attempts: number[]): RefreshRateLimitStatus {
    const isLimited = attempts.length >= REFRESH_RATE_LIMIT_MAX_ATTEMPTS;
    const nextChangeAt = attempts.length > 0 ? attempts[0] + REFRESH_RATE_LIMIT_WINDOW_MS : null;

    return {
        isLimited,
        remaining: Math.max(REFRESH_RATE_LIMIT_MAX_ATTEMPTS - attempts.length, 0),
        nextAllowedAt: isLimited ? nextChangeAt : null,
        nextChangeAt,
    };
}

export function getRefreshRateLimitStatus(now = Date.now()) {
    return statusForAttempts(activeRefreshAttempts(now));
}

export function reserveRefreshAttempt(now = Date.now()) {
    const attempts = activeRefreshAttempts(now);

    if (attempts.length < REFRESH_RATE_LIMIT_MAX_ATTEMPTS) {
        attempts.push(now);
        writeRefreshAttempts(attempts);
    }

    return statusForAttempts(attempts);
}

export function isCatalogCacheFresh(cached: CachedCatalog, now = Date.now()) {
    return now - cached.savedAt < CACHE_MAX_AGE_MS;
}
