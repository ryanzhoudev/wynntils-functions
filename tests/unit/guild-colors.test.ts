import {
    analyzeGuildColor,
    createGuildColorPalette,
    findDirectionalColorSuggestions,
    GUILD_COLOR_PLACEHOLDER,
    guildColorBrightness,
    hsvToRgb,
    MIN_GUILD_COLOR_BRIGHTNESS,
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

    it("keeps strict six-digit Athena colors and explicitly excludes the placeholder", () => {
        const result = parseAthenaGuildColors({
            data: [
                { _id: "Valid Guild", prefix: "VG", color: "#12ab90" },
                { _id: "Placeholder Guild", prefix: "PG", color: GUILD_COLOR_PLACEHOLDER.toLowerCase() },
                { _id: "Legacy Guild", prefix: "LG", color: "#1234" },
                { _id: "Blank Guild", prefix: "BG", color: "" },
                { _id: "No Prefix", color: "#ABCDEF" },
            ],
        });

        expect(result).toEqual({
            guilds: [
                { name: "Valid Guild", prefix: "VG", color: "#12AB90" },
                { name: "No Prefix", prefix: "???", color: "#ABCDEF" },
            ],
            excludedPlaceholderCount: 1,
        });
    });

    it("rejects an unexpected Athena response instead of failing open", () => {
        expect(() => parseAthenaGuildColors({ guilds: [] })).toThrow("unexpected guild-list shape");
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
        { name: "Placeholder", prefix: "NOP", color: GUILD_COLOR_PLACEHOLDER },
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
        expect(palette.some((guild) => guild.color === GUILD_COLOR_PLACEHOLDER)).toBe(false);
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
