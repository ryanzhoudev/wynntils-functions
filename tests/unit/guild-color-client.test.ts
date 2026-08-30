import { loadGuildColorData, type GuildColorDataPhase } from "@/lib/guild-color-client";
import type { GuildColorApiResponse, GuildColorStatsApiResponse } from "@/lib/guild-colors";
import { afterEach, describe, expect, it, vi } from "vitest";

const colors: GuildColorApiResponse = {
    guilds: [{ name: "Active Guild", prefix: "ACT", color: "#FF0000" }],
    fetchedAt: 1,
    cacheSeconds: 600,
    stats: null,
    source: {
        url: "https://example.com/guilds",
        etag: null,
        freshness: "request-time-only",
    },
};

const stats: GuildColorStatsApiResponse = {
    guilds: [
        {
            name: "Active Guild",
            prefix: "ACT",
            wynncraftIdentityResolved: true,
            stats: {
                currentTerritories: 3,
                currentSeasonRating: 12_500,
                previousSeasonRating: 9_000,
            },
        },
    ],
    fetchedAt: 2,
    cacheSeconds: 60,
    currentSeason: { id: "32", startAt: "start", endAt: "end" },
    previousSeason: { id: "31", startAt: "start", endAt: "end" },
};

function jsonResponse(payload: unknown, ok = true): Response {
    return {
        ok,
        json: async () => payload,
    } as Response;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("guild color client loading", () => {
    it("labels the base colors and optional statistics as separate phases", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(jsonResponse(colors)).mockResolvedValueOnce(jsonResponse(stats)),
        );
        const updates: Array<{ data: GuildColorApiResponse; phase: GuildColorDataPhase }> = [];

        await loadGuildColorData(new AbortController().signal, (data, phase) => updates.push({ data, phase }));

        expect(updates.map(({ phase }) => phase)).toEqual(["colors", "stats"]);
        expect(updates[0].data).toBe(colors);
        expect(updates[1].data.guilds[0].stats).toEqual(stats.guilds[0].stats);
    });

    it("reports optional statistics failures after returning base colors", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(jsonResponse(colors))
                .mockResolvedValueOnce(
                    jsonResponse({ error: "Guild activity statistics are temporarily unavailable." }, false),
                ),
        );
        const updates: Array<{ data: GuildColorApiResponse; phase: GuildColorDataPhase }> = [];
        const onStatsUnavailable = vi.fn();

        await loadGuildColorData(
            new AbortController().signal,
            (data, phase) => updates.push({ data, phase }),
            onStatsUnavailable,
        );

        expect(updates.map(({ phase }) => phase)).toEqual(["colors"]);
        expect(onStatsUnavailable).toHaveBeenCalledWith(
            "Guild activity statistics are temporarily unavailable.",
        );
    });
});
