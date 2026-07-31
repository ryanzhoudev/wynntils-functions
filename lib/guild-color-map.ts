import {
    deltaE76,
    GuildColorPaletteEntry,
    GuildColorRecord,
    guildColorBrightness,
    labToRgb,
    Lab,
    MIN_GUILD_COLOR_BRIGHTNESS,
    MIN_GUILD_COLOR_DELTA_E,
    rgbToLab,
} from "@/lib/guild-colors";

export const GUILD_COLOR_MAP_A_MIN = -100;
export const GUILD_COLOR_MAP_A_MAX = 100;
export const GUILD_COLOR_MAP_B_MIN = -110;
export const GUILD_COLOR_MAP_B_MAX = 100;
export const GUILD_COLOR_MAP_DEFAULT_LIGHTNESS = 75;
export const GUILD_COLOR_MAP_PREVIEW_RESOLUTION = 360;
export const GUILD_COLOR_MAP_RESOLUTION = 600;
export const GUILD_COLOR_MAP_MEDIUM_RESOLUTION = 768;
export const GUILD_COLOR_MAP_LARGE_RESOLUTION = 1024;

export const GUILD_COLOR_MAP_FLAG_IN_GAMUT = 1;
export const GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH = 2;
export const GUILD_COLOR_MAP_FLAG_CLAIMED = 4;

export interface GuildColorMapGroup {
    color: string;
    lab: Lab;
    guilds: GuildColorRecord[];
}

export interface GuildColorMapWorkerGroup {
    color: string;
    lab: Lab;
}

export interface GuildColorMapPoint {
    lab: Lab;
    rgb: ReturnType<typeof labToRgb>["rgb"];
    inGamut: boolean;
}

export interface GuildColorMapClassification {
    brightEnough: boolean;
    closestDistance: number;
    closestGroupIndex: number;
    claimed: boolean;
    allowed: boolean;
}

export interface GuildColorMapRenderRequest {
    type: "render";
    requestId: number;
    lightness: number;
    width: number;
    height: number;
    groups: GuildColorMapWorkerGroup[];
}

export interface GuildColorMapRenderResponse {
    type: "rendered";
    requestId: number;
    lightness: number;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
    owners: Int32Array;
    flags: Uint8Array;
    statistics: {
        inGamut: number;
        allowed: number;
        claimed: number;
        tooDark: number;
    };
    renderTimeMs: number;
}

export interface GuildColorMapRenderFailure {
    type: "error";
    requestId: number;
    message: string;
}

export type GuildColorMapWorkerResponse = GuildColorMapRenderResponse | GuildColorMapRenderFailure;

export function guildColorMapFullResolution(displayWidth: number): number {
    if (displayWidth > (GUILD_COLOR_MAP_MEDIUM_RESOLUTION + GUILD_COLOR_MAP_LARGE_RESOLUTION) / 2) {
        return GUILD_COLOR_MAP_LARGE_RESOLUTION;
    }

    if (displayWidth > (GUILD_COLOR_MAP_RESOLUTION + GUILD_COLOR_MAP_MEDIUM_RESOLUTION) / 2) {
        return GUILD_COLOR_MAP_MEDIUM_RESOLUTION;
    }

    return GUILD_COLOR_MAP_RESOLUTION;
}

export function createGuildColorMapGroups(palette: GuildColorPaletteEntry[]): GuildColorMapGroup[] {
    const grouped = new Map<string, GuildColorMapGroup>();

    for (const guild of palette) {
        const record: GuildColorRecord = {
            name: guild.name,
            prefix: guild.prefix,
            color: guild.color,
        };
        const existing = grouped.get(guild.color);

        if (existing) {
            existing.guilds.push(record);
        } else {
            grouped.set(guild.color, {
                color: guild.color,
                lab: guild.lab,
                guilds: [record],
            });
        }
    }

    return Array.from(grouped.values())
        .map((group) => ({
            ...group,
            guilds: group.guilds.sort((first, second) => first.name.localeCompare(second.name)),
        }))
        .sort((first, second) => first.color.localeCompare(second.color));
}

export function mapPixelToLab(
    x: number,
    y: number,
    width: number,
    height: number,
    lightness: number,
): Lab {
    const horizontalProgress = width <= 1 ? 0.5 : x / (width - 1);
    const verticalProgress = height <= 1 ? 0.5 : y / (height - 1);

    return {
        L: lightness,
        a: GUILD_COLOR_MAP_A_MIN + horizontalProgress * (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN),
        b: GUILD_COLOR_MAP_B_MAX - verticalProgress * (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN),
    };
}

export function labToMapPosition(lab: Lab, width: number, height: number): { x: number; y: number } {
    return {
        x:
            ((lab.a - GUILD_COLOR_MAP_A_MIN) / (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN)) *
            (width - 1),
        y:
            ((GUILD_COLOR_MAP_B_MAX - lab.b) / (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN)) *
            (height - 1),
    };
}

export function readGuildColorMapPoint(
    x: number,
    y: number,
    width: number,
    height: number,
    lightness: number,
): GuildColorMapPoint {
    const lab = mapPixelToLab(x, y, width, height, lightness);
    const { rgb, inGamut } = labToRgb(lab);

    return {
        lab: rgbToLab(rgb),
        rgb,
        inGamut,
    };
}

export function classifyGuildColorMapPoint(
    point: GuildColorMapPoint,
    groups: ReadonlyArray<GuildColorMapWorkerGroup>,
): GuildColorMapClassification {
    const brightEnough = point.inGamut && guildColorBrightness(point.rgb) >= MIN_GUILD_COLOR_BRIGHTNESS;
    let closestGroupIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    if (point.inGamut) {
        for (const [index, group] of groups.entries()) {
            const distance = deltaE76(point.lab, group.lab);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestGroupIndex = index;
            }
        }
    }

    const claimed = closestDistance < MIN_GUILD_COLOR_DELTA_E;

    return {
        brightEnough,
        closestDistance,
        closestGroupIndex,
        claimed,
        allowed: point.inGamut && brightEnough && !claimed,
    };
}
