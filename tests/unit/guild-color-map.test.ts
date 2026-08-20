import {
    classifyGuildColorMapPoint,
    createGuildColorMapGroups,
    GUILD_COLOR_MAP_FLAG_CLAIMED,
    guildColorMapFullResolution,
    labToMapPosition,
} from "@/lib/guild-color-map";
import { renderGuildColorMapSlice } from "@/lib/guild-color-map/renderer";
import { createGuildColorPalette, labToRgb, rgbToLab } from "@/lib/guild-colors";
import { describe, expect, it } from "vitest";

describe("guild color map geometry", () => {
    it("adapts completed renders to the displayed map size", () => {
        expect(guildColorMapFullResolution(462)).toBe(600);
        expect(guildColorMapFullResolution(768)).toBe(768);
        expect(guildColorMapFullResolution(774)).toBe(1024);
        expect(guildColorMapFullResolution(1134)).toBe(1024);
        expect(guildColorMapFullResolution(550, 1.5)).toBe(1024);
        expect(guildColorMapFullResolution(656, 1.5)).toBe(1024);
    });

    it("round-trips representative sRGB colors through Lab", () => {
        for (const rgb of [
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 0, b: 0 },
            { r: 12, g: 144, b: 210 },
        ]) {
            const roundTrip = labToRgb(rgbToLab(rgb));

            expect(roundTrip.inGamut).toBe(true);
            expect(roundTrip.rgb).toEqual(rgb);
        }
    });

    it("groups guilds that share one exact registered color", () => {
        const stats = {
            currentTerritories: 2,
            currentSeasonRating: 12340,
            previousSeasonRating: 9000,
        };
        const groups = createGuildColorMapGroups(
            createGuildColorPalette([
                { name: "Second", prefix: "TWO", color: "#FF0000", stats },
                { name: "First", prefix: "ONE", color: "#FF0000" },
                { name: "Blue", prefix: "BLU", color: "#0000FF" },
            ]),
        );

        expect(groups).toHaveLength(2);
        expect(groups.find((group) => group.color === "#FF0000")?.guilds.map((guild) => guild.name)).toEqual([
            "First",
            "Second",
        ]);
        expect(groups.find((group) => group.color === "#FF0000")?.guilds[1].stats).toEqual(stats);
    });

    it("classifies exact registered colors as claimed and bright unclaimed colors as allowed", () => {
        const groups = createGuildColorMapGroups(
            createGuildColorPalette([{ name: "Red", prefix: "RED", color: "#FF0000" }]),
        );
        const red = { lab: rgbToLab({ r: 255, g: 0, b: 0 }), rgb: { r: 255, g: 0, b: 0 }, inGamut: true };
        const white = {
            lab: rgbToLab({ r: 255, g: 255, b: 255 }),
            rgb: { r: 255, g: 255, b: 255 },
            inGamut: true,
        };

        expect(classifyGuildColorMapPoint(red, groups)).toMatchObject({
            claimed: true,
            allowed: false,
            closestGroupIndex: 0,
            closestDistance: 0,
        });
        expect(classifyGuildColorMapPoint(white, groups)).toMatchObject({
            brightEnough: true,
            claimed: false,
            allowed: true,
        });
    });

    it("rasterizes the registered color into its nearest-guild claim region", () => {
        const groups = createGuildColorMapGroups(
            createGuildColorPalette([{ name: "Red", prefix: "RED", color: "#FF0000" }]),
        );
        const width = 128;
        const height = 128;
        const position = labToMapPosition(groups[0].lab, width, height);
        const x = Math.round(position.x);
        const y = Math.round(position.y);
        const result = renderGuildColorMapSlice({
            type: "render",
            requestId: 1,
            lightness: groups[0].lab.L,
            width,
            height,
            groups,
        });
        const nearbyIndices = Array.from({ length: 9 }, (_, yOffset) =>
            Array.from({ length: 9 }, (_, xOffset) => (y + yOffset - 4) * width + (x + xOffset - 4)),
        ).flat();
        const claimedIndex = nearbyIndices.find((index) => result.owners[index] === 0);

        expect(claimedIndex).toBeDefined();
        expect(result.flags[claimedIndex!] & GUILD_COLOR_MAP_FLAG_CLAIMED).toBe(
            GUILD_COLOR_MAP_FLAG_CLAIMED,
        );
        expect(result.statistics.inGamut).toBeGreaterThan(0);
        expect(result.statistics.claimed).toBeGreaterThan(0);
        expect(result.statistics.allowed).toBeGreaterThan(0);
    });
});
