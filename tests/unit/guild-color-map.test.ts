import {
    createGuildColorMapGroups,
    GUILD_COLOR_MAP_FLAG_CLAIMED,
    guildColorMapFullResolution,
    labToMapPosition,
    shouldApplyGuildColorMapResponse,
} from "@/lib/guild-color-map";
import { renderGuildColorMapSlice } from "@/lib/guild-color-map/renderer";
import { createGuildColorPalette, evaluateGuildColor, labToRgb, rgbToLab } from "@/lib/guild-colors";
import { describe, expect, it } from "vitest";

describe("guild color map geometry", () => {
    it("applies ordered preview frames while newer render requests are still pending", () => {
        const latestRequestedRequestId = 5;
        const completedPreviewRequestId = 4;

        expect(completedPreviewRequestId).toBeLessThan(latestRequestedRequestId);
        expect(shouldApplyGuildColorMapResponse(completedPreviewRequestId, 1, 3)).toBe(true);
        expect(shouldApplyGuildColorMapResponse(completedPreviewRequestId, 1, 4)).toBe(false);
        expect(shouldApplyGuildColorMapResponse(completedPreviewRequestId, 4, 0)).toBe(false);
    });

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

    it("evaluates sampled RGB colors against grouped map colors the same as picker hex colors", () => {
        const palette = createGuildColorPalette([
            { name: "Red", prefix: "RED", color: "#FF0000" },
            { name: "Blue", prefix: "BLU", color: "#0000FF" },
        ]);
        const groups = createGuildColorMapGroups(palette);
        const redVerdict = evaluateGuildColor({ r: 255, g: 0, b: 0 }, groups);

        expect(groups[redVerdict.closestIndex].color).toBe("#FF0000");
        expect(redVerdict).toMatchObject({ allowed: false, uniqueEnough: false, closestDistance: 0 });
        expect(evaluateGuildColor("#FF0000", palette)).toMatchObject({ allowed: redVerdict.allowed });
        expect(evaluateGuildColor({ r: 255, g: 255, b: 255 }, groups)).toEqual(
            evaluateGuildColor("#FFFFFF", groups),
        );
        expect(evaluateGuildColor({ r: 0, g: 0, b: 0 }, [])).toMatchObject({
            allowed: false,
            brightEnough: false,
            closestIndex: -1,
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
        const { response, owners, flags } = renderGuildColorMapSlice({
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
        const claimedIndex = nearbyIndices.find((index) => owners[index] === 0);

        expect(claimedIndex).toBeDefined();
        expect(flags[claimedIndex!] & GUILD_COLOR_MAP_FLAG_CLAIMED).toBe(
            GUILD_COLOR_MAP_FLAG_CLAIMED,
        );
        expect(response.statistics.inGamut).toBeGreaterThan(0);
        expect(response.statistics.claimed).toBeGreaterThan(0);
        expect(response.statistics.allowed).toBeGreaterThan(0);
    });
});
