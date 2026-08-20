export const MIN_GUILD_COLOR_BRIGHTNESS = 60;
export const MIN_GUILD_COLOR_DELTA_E = 20;
export const GUILD_COLOR_PLACEHOLDER = "#C05F5F";
export const WYNNCRAFT_GUILD_STATS_BASE_URL = "https://wynncraft.com/stats/guild";

export interface GuildColorStats {
    currentTerritories: number | null;
    currentSeasonRating: number | null;
    previousSeasonRating: number | null;
}

export interface GuildSeasonMetadata {
    id: string;
    startAt: string;
    endAt: string;
}

export interface GuildColorRecord {
    name: string;
    prefix: string;
    color: string;
    stats?: GuildColorStats;
}

export interface GuildColorApiResponse {
    guilds: GuildColorRecord[];
    fetchedAt: number;
    cacheSeconds: number;
    excludedPlaceholderCount: number;
    stats: {
        fetchedAt: number;
        cacheSeconds: number;
        currentSeason: GuildSeasonMetadata | null;
        previousSeason: GuildSeasonMetadata | null;
    };
    source: {
        url: string;
        etag: string | null;
        freshness: "request-time-only";
    };
}

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

export interface Lab {
    L: number;
    a: number;
    b: number;
}

export interface LabToRgbResult {
    rgb: Rgb;
    inGamut: boolean;
}

export interface Hsv {
    h: number;
    s: number;
    v: number;
}

export interface GuildColorPaletteEntry extends GuildColorRecord {
    lab: Lab;
}

export interface GuildColorGroup {
    color: string;
    distance: number;
    guilds: GuildColorRecord[];
}

export interface GuildColorVerdict {
    allowed: boolean;
    brightEnough: boolean;
    uniqueEnough: boolean;
    brightness: number;
    closestDistance: number;
}

export interface GuildColorAnalysis extends GuildColorVerdict {
    groups: GuildColorGroup[];
    conflictingGroups: GuildColorGroup[];
}

export type RgbChannel = "r" | "g" | "b";
export type RgbDirection = -1 | 1;

export interface DirectionalColorSuggestion extends GuildColorVerdict {
    channel: RgbChannel;
    direction: RgbDirection;
    label: string;
    color: string;
    steps: number;
}

export interface ParsedAthenaGuildColors {
    guilds: GuildColorRecord[];
    excludedPlaceholderCount: number;
}

export const GUILD_COLOR_DIRECTIONS: ReadonlyArray<{
    channel: RgbChannel;
    direction: RgbDirection;
    label: string;
}> = [
    { channel: "r", direction: -1, label: "R−" },
    { channel: "r", direction: 1, label: "R+" },
    { channel: "g", direction: -1, label: "G−" },
    { channel: "g", direction: 1, label: "G+" },
    { channel: "b", direction: -1, label: "B−" },
    { channel: "b", direction: 1, label: "B+" },
];

export function normalizeGuildColorHex(input: string): string | null {
    const value = input.trim().replace(/^#/, "");

    if (/^[0-9a-f]{3}$/i.test(value)) {
        return `#${value
            .split("")
            .map((character) => character + character)
            .join("")
            .toUpperCase()}`;
    }

    return /^[0-9a-f]{6}$/i.test(value) ? `#${value.toUpperCase()}` : null;
}

export function hexToRgb(hex: string): Rgb | null {
    const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);

    if (!match) {
        return null;
    }

    return {
        r: Number.parseInt(match[1], 16),
        g: Number.parseInt(match[2], 16),
        b: Number.parseInt(match[3], 16),
    };
}

export function guildColorBrightness({ r, g, b }: Rgb): number {
    return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
}

function srgbToLinear(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
    const red = srgbToLinear(r / 255);
    const green = srgbToLinear(g / 255);
    const blue = srgbToLinear(b / 255);
    const x = red * 0.4124 + green * 0.3576 + blue * 0.1805;
    const y = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const z = red * 0.0193 + green * 0.1192 + blue * 0.9505;
    const transform = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
    const fx = transform(x / 0.95047);
    const fy = transform(y);
    const fz = transform(z / 1.08883);

    return {
        L: 116 * fy - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz),
    };
}

export function deltaE76(first: Lab, second: Lab): number {
    const lightness = first.L - second.L;
    const greenRed = first.a - second.a;
    const blueYellow = first.b - second.b;

    return Math.sqrt(lightness * lightness + greenRed * greenRed + blueYellow * blueYellow);
}

function linearToSrgb(channel: number): number {
    return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function labTransformInverse(value: number): number {
    const cubed = value ** 3;

    return cubed > 0.008856 ? cubed : (value - 16 / 116) / 7.787;
}

export function labToRgb({ L, a, b }: Lab): LabToRgbResult {
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    const x = 0.95047 * labTransformInverse(fx);
    const y = labTransformInverse(fy);
    const z = 1.08883 * labTransformInverse(fz);
    const linearRed = x * 3.2406 + y * -1.5372 + z * -0.4986;
    const linearGreen = x * -0.9689 + y * 1.8758 + z * 0.0415;
    const linearBlue = x * 0.0557 + y * -0.204 + z * 1.057;
    const channels = [linearToSrgb(linearRed), linearToSrgb(linearGreen), linearToSrgb(linearBlue)];
    const inGamut = channels.every((channel) => channel >= -0.0001 && channel <= 1.0001);
    const [r, g, blue] = channels.map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));

    return {
        rgb: { r, g, b: blue },
        inGamut,
    };
}

export function rgbToHex({ r, g, b }: Rgb): string {
    return `#${[r, g, b]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`;
}

export function guildStatsUrl(guildName: string): string {
    return `${WYNNCRAFT_GUILD_STATS_BASE_URL}/${encodeURIComponent(guildName)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    let hue = 0;

    if (delta > 0) {
        if (maximum === red) {
            hue = 60 * (((green - blue) / delta) % 6);
        } else if (maximum === green) {
            hue = 60 * ((blue - red) / delta + 2);
        } else {
            hue = 60 * ((red - green) / delta + 4);
        }
    }

    return {
        h: hue < 0 ? hue + 360 : hue,
        s: maximum === 0 ? 0 : delta / maximum,
        v: maximum,
    };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
    const hue = ((h % 360) + 360) % 360;
    const saturation = Math.min(1, Math.max(0, s));
    const value = Math.min(1, Math.max(0, v));
    const chroma = value * saturation;
    const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = value - chroma;
    let channels: [number, number, number];

    if (hue < 60) {
        channels = [chroma, secondary, 0];
    } else if (hue < 120) {
        channels = [secondary, chroma, 0];
    } else if (hue < 180) {
        channels = [0, chroma, secondary];
    } else if (hue < 240) {
        channels = [0, secondary, chroma];
    } else if (hue < 300) {
        channels = [secondary, 0, chroma];
    } else {
        channels = [chroma, 0, secondary];
    }

    const [red, green, blue] = channels.map((channel) => Math.round((channel + offset) * 255));

    return { r: red, g: green, b: blue };
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function parseAthenaGuildColors(payload: unknown): ParsedAthenaGuildColors {
    const possibleCollection =
        typeof payload === "object" && payload !== null && "data" in payload
            ? (payload as { data?: unknown }).data
            : payload;

    if (!Array.isArray(possibleCollection)) {
        throw new Error("Athena returned an unexpected guild-list shape.");
    }

    const guilds: GuildColorRecord[] = [];
    let excludedPlaceholderCount = 0;

    for (const item of possibleCollection) {
        if (typeof item !== "object" || item === null) {
            continue;
        }

        const record = item as Record<string, unknown>;
        const name = readString(record._id);
        const color = typeof record.color === "string" ? record.color.trim().toUpperCase() : "";

        if (!name || !/^#[0-9A-F]{6}$/.test(color)) {
            continue;
        }

        if (color === GUILD_COLOR_PLACEHOLDER) {
            excludedPlaceholderCount += 1;
            continue;
        }

        guilds.push({
            name,
            prefix: readString(record.prefix) ?? "???",
            color,
        });
    }

    return { guilds, excludedPlaceholderCount };
}

export function createGuildColorPalette(guilds: GuildColorRecord[]): GuildColorPaletteEntry[] {
    return guilds.flatMap((guild) => {
        const color = normalizeGuildColorHex(guild.color);
        const rgb = color ? hexToRgb(color) : null;

        if (!color || !rgb || color === GUILD_COLOR_PLACEHOLDER) {
            return [];
        }

        return [{ ...guild, color, lab: rgbToLab(rgb) }];
    });
}

function evaluateRgb(rgb: Rgb, palette: GuildColorPaletteEntry[]): GuildColorVerdict {
    const brightness = guildColorBrightness(rgb);
    const targetLab = rgbToLab(rgb);
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const guild of palette) {
        closestDistance = Math.min(closestDistance, deltaE76(targetLab, guild.lab));
    }

    const brightEnough = brightness >= MIN_GUILD_COLOR_BRIGHTNESS;
    const uniqueEnough = !Number.isFinite(closestDistance) || closestDistance >= MIN_GUILD_COLOR_DELTA_E;

    return {
        allowed: brightEnough && uniqueEnough,
        brightEnough,
        uniqueEnough,
        brightness,
        closestDistance,
    };
}

export function evaluateGuildColor(hex: string, palette: GuildColorPaletteEntry[]): GuildColorVerdict {
    const rgb = hexToRgb(hex);

    if (!rgb) {
        throw new Error("A normalized six-digit hex color is required.");
    }

    return evaluateRgb(rgb, palette);
}

export function analyzeGuildColor(hex: string, palette: GuildColorPaletteEntry[]): GuildColorAnalysis {
    const rgb = hexToRgb(hex);

    if (!rgb) {
        throw new Error("A normalized six-digit hex color is required.");
    }

    const targetLab = rgbToLab(rgb);
    const grouped = new Map<string, GuildColorGroup>();

    for (const guild of palette) {
        const distance = deltaE76(targetLab, guild.lab);
        const existing = grouped.get(guild.color);
        const guildRecord: GuildColorRecord = {
            name: guild.name,
            prefix: guild.prefix,
            color: guild.color,
            stats: guild.stats,
        };

        if (existing) {
            existing.guilds.push(guildRecord);
        } else {
            grouped.set(guild.color, {
                color: guild.color,
                distance,
                guilds: [guildRecord],
            });
        }
    }

    const groups = Array.from(grouped.values())
        .map((group) => ({
            ...group,
            guilds: group.guilds.sort((first, second) => first.name.localeCompare(second.name)),
        }))
        .sort((first, second) => first.distance - second.distance || first.color.localeCompare(second.color));
    const verdict = evaluateRgb(rgb, palette);

    return {
        ...verdict,
        groups,
        conflictingGroups: groups.filter((group) => group.distance < MIN_GUILD_COLOR_DELTA_E),
    };
}

export function findDirectionalColorSuggestions(
    hex: string,
    palette: GuildColorPaletteEntry[],
): DirectionalColorSuggestion[] {
    const rgb = hexToRgb(hex);

    if (!rgb) {
        return [];
    }

    return GUILD_COLOR_DIRECTIONS.flatMap(({ channel, direction, label }) => {
        for (
            let channelValue = rgb[channel] + direction;
            channelValue >= 0 && channelValue <= 255;
            channelValue += direction
        ) {
            const candidateRgb = { ...rgb, [channel]: channelValue };
            const verdict = evaluateRgb(candidateRgb, palette);

            if (verdict.allowed) {
                return [
                    {
                        ...verdict,
                        channel,
                        direction,
                        label,
                        color: rgbToHex(candidateRgb),
                        steps: Math.abs(channelValue - rgb[channel]),
                    },
                ];
            }
        }

        return [];
    });
}
