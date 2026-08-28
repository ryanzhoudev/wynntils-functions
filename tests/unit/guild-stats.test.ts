import type { GuildColorRecord } from "@/lib/guild-colors";
import {
    enrichGuildColorStats,
    parseGuildDirectory,
    parseGuildSeasonLeaderboard,
    parseGuildTerritoryCounts,
    resolveGuildUuid,
    selectGuildSeasons,
} from "@/lib/guild-stats";
import { describe, expect, it } from "vitest";

describe("Wynncraft guild statistics parsing", () => {
    it("selects current and previous seasons from both supported start-date fields", () => {
        const seasons = selectGuildSeasons(
            {
                30: {
                    initDate: "2026-01-01T00:00:00Z",
                    endDate: "2026-02-01T00:00:00Z",
                },
                31: {
                    startDate: "2026-03-01T00:00:00Z",
                    endDate: "2026-04-01T00:00:00Z",
                },
                invalid: {
                    startDate: "not-a-date",
                    endDate: "2026-05-01T00:00:00Z",
                },
            },
            Date.parse("2026-03-15T00:00:00Z"),
        );

        expect(seasons).toEqual({
            current: {
                id: "31",
                startAt: "2026-03-01T00:00:00.000Z",
                endAt: "2026-04-01T00:00:00.000Z",
            },
            previous: {
                id: "30",
                startAt: "2026-01-01T00:00:00.000Z",
                endAt: "2026-02-01T00:00:00.000Z",
            },
        });
    });

    it("uses the latest completed season while between seasons", () => {
        const seasons = selectGuildSeasons(
            {
                30: {
                    startDate: "2026-01-01T00:00:00Z",
                    endDate: "2026-02-01T00:00:00Z",
                },
                31: {
                    startDate: "2026-03-01T00:00:00Z",
                    endDate: "2026-04-01T00:00:00Z",
                },
            },
            Date.parse("2026-04-15T00:00:00Z"),
        );

        expect(seasons.current).toBeNull();
        expect(seasons.previous?.id).toBe("31");
    });

    it("resolves trimmed names and uses prefixes to disambiguate case collisions", () => {
        const directory = parseGuildDirectory({
            " Spaced Guild ": { uuid: "spaced-id", prefix: "SPC" },
            Collision: { uuid: "first-id", prefix: "ONE" },
            collision: { uuid: "second-id", prefix: "TWO" },
        });

        expect(resolveGuildUuid({ name: "Spaced Guild", prefix: "SPC", color: "#FFFFFF" }, directory)).toBe(
            "spaced-id",
        );
        expect(resolveGuildUuid({ name: "COLLISION", prefix: "TWO", color: "#FFFFFF" }, directory)).toBe("second-id");
        expect(resolveGuildUuid({ name: "COLLISION", prefix: "???", color: "#FFFFFF" }, directory)).toBeNull();
    });

    it("counts current territories by guild UUID and parses leaderboard completeness", () => {
        expect(
            Array.from(
                parseGuildTerritoryCounts({
                    Ragni: { guild: { uuid: "guild-a" } },
                    Detlas: { guild: { uuid: "guild-a" } },
                    Troms: { guild: { uuid: "guild-b" } },
                    Invalid: { guild: null },
                }),
            ),
        ).toEqual([
            ["guild-a", 2],
            ["guild-b", 1],
        ]);

        const leaderboard = parseGuildSeasonLeaderboard({
            1: { uuid: "guild-a", score: 12340 },
            2: { uuid: "guild-b", score: 8000 },
        });

        expect(leaderboard.complete).toBe(true);
        expect(Array.from(leaderboard.ratings)).toEqual([
            ["guild-a", 12340],
            ["guild-b", 8000],
        ]);
        expect(
            parseGuildSeasonLeaderboard(
                {
                    1: { uuid: "guild-a", score: 12340 },
                    2: { uuid: "guild-b", score: 8000 },
                },
                2,
            ).complete,
        ).toBe(false);
    });
});

describe("guild color statistics enrichment", () => {
    const guilds: GuildColorRecord[] = [
        { name: "Active Guild", prefix: "ACT", color: "#FF0000" },
        { name: "Quiet Guild", prefix: "QUT", color: "#00FF00" },
        { name: "Stale Guild", prefix: "OLD", color: "#0000FF" },
    ];
    const directory = [
        { name: "Active Guild", prefix: "ACT", uuid: "active-id" },
        { name: "Quiet Guild", prefix: "QUT", uuid: "quiet-id" },
    ];

    it("joins exact values, complete-list zeroes, and capped-list unknowns", () => {
        const enriched = enrichGuildColorStats(guilds, {
            directory,
            territoryCounts: new Map([["active-id", 3]]),
            currentSeasonLeaderboard: {
                ratings: new Map([["active-id", 12500]]),
                complete: true,
            },
            previousSeasonLeaderboard: {
                ratings: new Map([["active-id", 9000]]),
                complete: false,
            },
        });

        expect(enriched.map((guild) => guild.stats)).toEqual([
            {
                currentTerritories: 3,
                currentSeasonRating: 12500,
                previousSeasonRating: 9000,
            },
            {
                currentTerritories: 0,
                currentSeasonRating: 0,
                previousSeasonRating: null,
            },
            {
                currentTerritories: null,
                currentSeasonRating: null,
                previousSeasonRating: null,
            },
        ]);
        expect(enriched.map((guild) => guild.wynncraftIdentityResolved)).toEqual([true, true, false]);
    });

    it("keeps each independently unavailable source unknown", () => {
        const [enriched] = enrichGuildColorStats(guilds.slice(0, 1), {
            directory,
            territoryCounts: null,
            currentSeasonLeaderboard: null,
            previousSeasonLeaderboard: {
                ratings: new Map(),
                complete: true,
            },
        });

        expect(enriched.stats).toEqual({
            currentTerritories: null,
            currentSeasonRating: null,
            previousSeasonRating: 0,
        });
        expect(enriched.wynncraftIdentityResolved).toBe(true);
    });

    it("marks guild identity as unknown when the Wynncraft directory is unavailable", () => {
        const [enriched] = enrichGuildColorStats(guilds.slice(0, 1), {
            directory: null,
            territoryCounts: new Map(),
            currentSeasonLeaderboard: { ratings: new Map(), complete: true },
            previousSeasonLeaderboard: { ratings: new Map(), complete: true },
        });

        expect(enriched.wynncraftIdentityResolved).toBeNull();
        expect(enriched.stats).toEqual({
            currentTerritories: null,
            currentSeasonRating: null,
            previousSeasonRating: null,
        });
    });
});
