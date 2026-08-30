import {
    analyzeGuildColor,
    createGuildColorPalette,
    filterGuildColorsByActivity,
    findGuildColorsByIdentity,
    findDirectionalColorSuggestions,
    GUILD_ACTIVITY_RATING_THRESHOLD,
    guildStatsUrl,
    guildColorBrightness,
    hsvToRgb,
    isGuildBelowActivityThreshold,
    MIN_GUILD_COLOR_BRIGHTNESS,
    mergeGuildColorStats,
    normalizeGuildColorHex,
    parseAthenaGuildColors,
    rgbToHsv,
} from "@/lib/guild-colors";
import { describe, expect, it } from "vitest";

describe("guild color normalization and Athena parsing", () => {
    it("normalizes the same three- and six-digit formats accepted by the bot", () => {
        expect(normalizeGuildColorHex(" abc ")).toBe("#AABBCC");
        expect(normalizeGuildColorHex("#12ef90")).toBe("#12EF90");
        expect(normalizeGuildColorHex("not-a-color")).toBeNull();
    });

    it("keeps all strict six-digit Athena colors, including #C05F5F", () => {
        const result = parseAthenaGuildColors({
            data: [
                { _id: "Valid Guild", prefix: "VG", color: "#12ab90" },
                { _id: "Rose Guild", prefix: "RG", color: "#c05f5f" },
                { _id: "Legacy Guild", prefix: "LG", color: "#1234" },
                { _id: "Blank Guild", prefix: "BG", color: "" },
                { _id: "No Prefix", color: "#ABCDEF" },
            ],
        });

        expect(result).toEqual({
            guilds: [
                { name: "Valid Guild", prefix: "VG", color: "#12AB90" },
                { name: "Rose Guild", prefix: "RG", color: "#C05F5F" },
                { name: "No Prefix", prefix: "???", color: "#ABCDEF" },
            ],
        });
    });

    it("rejects an unexpected Athena response instead of failing open", () => {
        expect(() => parseAthenaGuildColors({ guilds: [] })).toThrow("unexpected guild-list shape");
    });

    it("builds encoded Wynncraft guild profile links", () => {
        expect(guildStatsUrl("Red One / Ω")).toBe(
            "https://wynncraft.com/stats/guild/Red%20One%20%2F%20%CE%A9",
        );
    });

    it("merges separately loaded statistics by normalized guild identity", () => {
        const merged = mergeGuildColorStats(
            {
                guilds: [
                    { name: "Active Guild", prefix: "ACT", color: "#FF0000" },
                    { name: "Unmatched Guild", prefix: "OLD", color: "#0000FF" },
                ],
                fetchedAt: 1,
                cacheSeconds: 600,
                stats: null,
                source: {
                    url: "https://example.com/guilds",
                    etag: null,
                    freshness: "request-time-only",
                },
            },
            {
                guilds: [
                    {
                        name: " active guild ",
                        prefix: "act",
                        wynncraftIdentityResolved: true,
                        stats: {
                            currentTerritories: 3,
                            currentSeasonRating: 12500,
                            previousSeasonRating: 9000,
                        },
                    },
                ],
                fetchedAt: 2,
                cacheSeconds: 60,
                currentSeason: { id: "32", startAt: "start", endAt: "end" },
                previousSeason: { id: "31", startAt: "start", endAt: "end" },
            },
        );

        expect(merged.guilds[0].stats).toEqual({
            currentTerritories: 3,
            currentSeasonRating: 12500,
            previousSeasonRating: 9000,
        });
        expect(merged.guilds[0].wynncraftIdentityResolved).toBe(true);
        expect(merged.guilds[1].stats).toBeUndefined();
        expect(merged.guilds[1].wynncraftIdentityResolved).toBeUndefined();
        expect(merged.stats).toMatchObject({
            fetchedAt: 2,
            cacheSeconds: 60,
            currentSeason: { id: "32" },
            previousSeason: { id: "31" },
        });
    });

    it("finds guild colors by bracketed tag or name with the strongest matches first", () => {
        const guilds = [
            { name: "The Blue Guild", prefix: "BLU", color: "#0000FF" },
            { name: "Bluestone", prefix: "STONE", color: "#1111FF" },
            { name: "Blue", prefix: "B", color: "#2222FF" },
            { name: "Other", prefix: "XBLU", color: "#3333FF" },
        ];

        expect(findGuildColorsByIdentity(guilds, " [blu] ").map((guild) => guild.name)).toEqual([
            "The Blue Guild",
            "Blue",
            "Bluestone",
            "Other",
        ]);
        expect(findGuildColorsByIdentity(guilds, "BLUE", 2).map((guild) => guild.name)).toEqual([
            "Blue",
            "Bluestone",
        ]);
        expect(findGuildColorsByIdentity(guilds, "missing")).toEqual([]);
    });

    it("filters known low activity and unresolved identities without guessing on unavailable sources", () => {
        const belowThreshold = {
            currentTerritories: 0,
            currentSeasonRating: GUILD_ACTIVITY_RATING_THRESHOLD - 1,
            previousSeasonRating: 0,
        };
        const records = [
            { name: "Below", prefix: "LOW", color: "#00FFFF", stats: belowThreshold },
            {
                name: "At threshold",
                prefix: "TEN",
                color: "#00FFFE",
                stats: { ...belowThreshold, currentSeasonRating: GUILD_ACTIVITY_RATING_THRESHOLD },
            },
            {
                name: "Has territory",
                prefix: "TER",
                color: "#00FFFD",
                stats: { ...belowThreshold, currentTerritories: 1 },
            },
            {
                name: "Unknown rating",
                prefix: "UNK",
                color: "#00FFFC",
                stats: { ...belowThreshold, previousSeasonRating: null },
            },
            {
                name: " Wanytails ",
                prefix: "wany",
                color: "#FF00FF",
                stats: belowThreshold,
                wynncraftIdentityResolved: false,
            },
            {
                name: "Missing from Wynncraft",
                prefix: "NIL",
                color: "#00FFFB",
                stats: { currentTerritories: null, currentSeasonRating: null, previousSeasonRating: null },
                wynncraftIdentityResolved: false,
            },
            {
                name: "Directory unavailable",
                prefix: "ERR",
                color: "#00FFFA",
                wynncraftIdentityResolved: null,
            },
            {
                name: "Resolved but stats unavailable",
                prefix: "API",
                color: "#00FFF9",
                stats: { currentTerritories: null, currentSeasonRating: null, previousSeasonRating: null },
                wynncraftIdentityResolved: true,
            },
        ];

        expect(isGuildBelowActivityThreshold(records[0])).toBe(true);
        expect(isGuildBelowActivityThreshold(records[4])).toBe(false);
        expect(filterGuildColorsByActivity(records, false)).toEqual(records);
        expect(filterGuildColorsByActivity(records, true).map((guild) => guild.name)).toEqual([
            "At threshold",
            "Has territory",
            "Unknown rating",
            " Wanytails ",
            "Directory unavailable",
            "Resolved but stats unavailable",
        ]);
    });

    it("removes only qualifying guilds from a shared color group", () => {
        const guilds = [
            {
                name: "Below",
                prefix: "LOW",
                color: "#FF0000",
                stats: { currentTerritories: 0, currentSeasonRating: 100, previousSeasonRating: 200 },
            },
            {
                name: "Active",
                prefix: "ACT",
                color: "#FF0000",
                stats: { currentTerritories: 1, currentSeasonRating: 0, previousSeasonRating: 0 },
            },
        ];
        const filteredAnalysis = analyzeGuildColor(
            "#FF0000",
            createGuildColorPalette(filterGuildColorsByActivity(guilds, true)),
        );

        expect(filteredAnalysis.conflictingGroups[0].guilds.map((guild) => guild.name)).toEqual(["Active"]);
    });
});

describe("inline color picker conversions", () => {
    it("round-trips representative RGB colors through HSV", () => {
        for (const rgb of [
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 0, b: 0 },
            { r: 12, g: 144, b: 210 },
            { r: 0, g: 0, b: 0 },
        ]) {
            expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb);
        }
    });

    it("clamps saturation and brightness when converting HSV", () => {
        expect(hsvToRgb({ h: 0, s: 2, v: 2 })).toEqual({ r: 255, g: 0, b: 0 });
        expect(hsvToRgb({ h: 120, s: -1, v: -1 })).toEqual({ r: 0, g: 0, b: 0 });
    });
});

describe("Wynntils Bot-compatible guild color analysis", () => {
    const guilds = [
        { name: "Red One", prefix: "R1", color: "#FF0000" },
        { name: "Red Two", prefix: "R2", color: "#FF0000" },
        { name: "Blue", prefix: "BLU", color: "#0000FF" },
        { name: "Rose", prefix: "RSE", color: "#C05F5F" },
    ];
    const palette = createGuildColorPalette(guilds);

    it("uses the bot perceptual brightness formula", () => {
        expect(guildColorBrightness({ r: 0, g: 0, b: 0 })).toBe(0);
        expect(guildColorBrightness({ r: 255, g: 255, b: 255 })).toBe(255);
        expect(guildColorBrightness({ r: 110, g: 0, b: 0 })).toBeGreaterThanOrEqual(MIN_GUILD_COLOR_BRIGHTNESS);
        expect(guildColorBrightness({ r: 109, g: 0, b: 0 })).toBeLessThan(MIN_GUILD_COLOR_BRIGHTNESS);
    });

    it("groups identical guild colors and reports every too-close group", () => {
        const analysis = analyzeGuildColor("#FF0000", palette);

        expect(analysis.allowed).toBe(false);
        expect(analysis.uniqueEnough).toBe(false);
        expect(analysis.closestDistance).toBe(0);
        expect(analysis.conflictingGroups[0]).toMatchObject({
            color: "#FF0000",
            distance: 0,
        });
        expect(analysis.conflictingGroups[0].guilds.map((guild) => guild.name)).toEqual(["Red One", "Red Two"]);
        expect(palette.some((guild) => guild.color === "#C05F5F")).toBe(true);
    });

    it("preserves guild statistics through closest-color analysis", () => {
        const stats = {
            currentTerritories: 2,
            currentSeasonRating: 12340,
            previousSeasonRating: 9000,
        };
        const analysis = analyzeGuildColor(
            "#FF0000",
            createGuildColorPalette([{ name: "Active", prefix: "ACT", color: "#FF0000", stats }]),
        );

        expect(analysis.groups[0].guilds[0].stats).toEqual(stats);
    });

    it("finds the nearest allowed value independently in all available RGB directions", () => {
        const suggestions = findDirectionalColorSuggestions("#000000", []);

        expect(suggestions.map(({ label, color }) => ({ label, color }))).toEqual([
            { label: "R+", color: "#6E0000" },
            { label: "G+", color: "#004F00" },
            { label: "B+", color: "#0000B2" },
        ]);
        expect(suggestions.every((suggestion) => suggestion.allowed)).toBe(true);
    });
});
