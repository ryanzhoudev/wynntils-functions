// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    FUNCTION_CATALOG_CACHE_KEY,
    FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY,
    getRefreshRateLimitStatus,
    isCatalogCacheFresh,
    readCachedCatalog,
    reserveRefreshAttempt,
    writeCachedCatalog,
} from "@/lib/function-catalog-cache";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

describe("function catalog cache", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    it("round-trips a validated catalog with one consistent timestamp", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
        const catalog = createRepresentativeCatalog();
        const written = writeCachedCatalog(catalog);

        expect(readCachedCatalog()).toEqual(written);
        expect(isCatalogCacheFresh(written)).toBe(true);
        expect(JSON.parse(localStorage.getItem(FUNCTION_CATALOG_CACHE_KEY) ?? "null")).toEqual(written);
    });

    it("removes malformed cache entries", () => {
        localStorage.setItem(FUNCTION_CATALOG_CACHE_KEY, JSON.stringify({ savedAt: "today", data: {} }));

        expect(readCachedCatalog()).toBeNull();
        expect(localStorage.getItem(FUNCTION_CATALOG_CACHE_KEY)).toBeNull();
    });

    it("tracks, limits, and prunes refresh attempts without polling", () => {
        const start = Date.parse("2026-07-03T12:00:00Z");

        for (let attempt = 0; attempt < 5; attempt++) {
            reserveRefreshAttempt(start + attempt);
        }

        expect(getRefreshRateLimitStatus(start + 5)).toMatchObject({
            isLimited: true,
            remaining: 0,
            nextAllowedAt: start + 15 * 60 * 1000,
        });

        reserveRefreshAttempt(start + 6);
        expect(JSON.parse(localStorage.getItem(FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY) ?? "[]")).toHaveLength(5);

        expect(getRefreshRateLimitStatus(start + 15 * 60 * 1000)).toMatchObject({
            isLimited: false,
            remaining: 1,
        });
        expect(JSON.parse(localStorage.getItem(FUNCTION_CATALOG_REFRESH_ATTEMPTS_KEY) ?? "[]")).toHaveLength(4);
    });
});
