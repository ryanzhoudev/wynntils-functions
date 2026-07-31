import {
    GUILD_COLOR_MAP_A_MAX,
    GUILD_COLOR_MAP_A_MIN,
    GUILD_COLOR_MAP_B_MAX,
    GUILD_COLOR_MAP_B_MIN,
    GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH,
    GUILD_COLOR_MAP_FLAG_CLAIMED,
    GUILD_COLOR_MAP_FLAG_IN_GAMUT,
    GuildColorMapRenderRequest,
    GuildColorMapRenderResponse,
    labToMapPosition,
    readGuildColorMapPoint,
} from "@/lib/guild-color-map";
import {
    guildColorBrightness,
    MIN_GUILD_COLOR_BRIGHTNESS,
    MIN_GUILD_COLOR_DELTA_E,
} from "@/lib/guild-colors";

function blendChannel(channel: number, target: number, amount: number): number {
    return Math.round(channel + (target - channel) * amount);
}

function setPixel(
    pixels: Uint8ClampedArray,
    index: number,
    red: number,
    green: number,
    blue: number,
    alpha = 255,
) {
    const offset = index * 4;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = alpha;
}

function readPixelChannel(pixels: Uint8ClampedArray, index: number, channel: 0 | 1 | 2): number {
    return pixels[index * 4 + channel];
}

function checkerboardChannel(x: number, y: number): number {
    return (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0 ? 24 : 31;
}

export function renderGuildColorMapSlice({
    requestId,
    lightness,
    width,
    height,
    groups,
}: GuildColorMapRenderRequest): GuildColorMapRenderResponse {
    const startedAt = performance.now();
    const pixelCount = width * height;
    const pixels = new Uint8ClampedArray(pixelCount * 4);
    const owners = new Int32Array(pixelCount);
    owners.fill(-1);
    const flags = new Uint8Array(pixelCount);
    const labLightness = new Float32Array(pixelCount);
    const labA = new Float32Array(pixelCount);
    const labB = new Float32Array(pixelCount);
    const bestDistanceSquared = new Float32Array(pixelCount);
    bestDistanceSquared.fill(MIN_GUILD_COLOR_DELTA_E ** 2);
    const statistics = {
        inGamut: 0,
        allowed: 0,
        claimed: 0,
        tooDark: 0,
    };

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x;
            const point = readGuildColorMapPoint(x, y, width, height, lightness);

            if (!point.inGamut) {
                const channel = checkerboardChannel(x, y);
                setPixel(pixels, index, channel, channel, channel + 3);
                continue;
            }

            flags[index] |= GUILD_COLOR_MAP_FLAG_IN_GAMUT;
            labLightness[index] = point.lab.L;
            labA[index] = point.lab.a;
            labB[index] = point.lab.b;
            setPixel(pixels, index, point.rgb.r, point.rgb.g, point.rgb.b);

            if (guildColorBrightness(point.rgb) >= MIN_GUILD_COLOR_BRIGHTNESS) {
                flags[index] |= GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH;
            }
        }
    }

    const thresholdWithRoundingMargin = MIN_GUILD_COLOR_DELTA_E + 1;

    for (const [groupIndex, group] of groups.entries()) {
        if (Math.abs(group.lab.L - lightness) > thresholdWithRoundingMargin) {
            continue;
        }

        const center = labToMapPosition(group.lab, width, height);
        const horizontalRadius =
            (thresholdWithRoundingMargin / (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN)) * (width - 1);
        const verticalRadius =
            (thresholdWithRoundingMargin / (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN)) * (height - 1);
        const startX = Math.max(0, Math.floor(center.x - horizontalRadius));
        const endX = Math.min(width - 1, Math.ceil(center.x + horizontalRadius));
        const startY = Math.max(0, Math.floor(center.y - verticalRadius));
        const endY = Math.min(height - 1, Math.ceil(center.y + verticalRadius));

        for (let y = startY; y <= endY; y += 1) {
            for (let x = startX; x <= endX; x += 1) {
                const index = y * width + x;

                if ((flags[index] & GUILD_COLOR_MAP_FLAG_IN_GAMUT) === 0) {
                    continue;
                }

                const lightnessDelta = labLightness[index] - group.lab.L;
                const greenRedDelta = labA[index] - group.lab.a;
                const blueYellowDelta = labB[index] - group.lab.b;
                const distanceSquared =
                    lightnessDelta * lightnessDelta +
                    greenRedDelta * greenRedDelta +
                    blueYellowDelta * blueYellowDelta;

                if (distanceSquared < bestDistanceSquared[index]) {
                    bestDistanceSquared[index] = distanceSquared;
                    owners[index] = groupIndex;
                }
            }
        }
    }

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x;

            if ((flags[index] & GUILD_COLOR_MAP_FLAG_IN_GAMUT) === 0) {
                continue;
            }

            const isBrightEnough = (flags[index] & GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH) !== 0;
            const isClaimed = owners[index] >= 0;
            const hatch = (x + y) % 12 < 2;
            let overlayAmount = 0;

            statistics.inGamut += 1;

            if (!isBrightEnough) {
                statistics.tooDark += 1;
                overlayAmount = hatch ? 0.76 : 0.62;
            } else if (isClaimed) {
                overlayAmount = hatch ? 0.48 : 0.32;
            }

            if (isClaimed) {
                flags[index] |= GUILD_COLOR_MAP_FLAG_CLAIMED;
                statistics.claimed += 1;
            }

            if (isBrightEnough && !isClaimed) {
                statistics.allowed += 1;
            }

            if (overlayAmount > 0) {
                setPixel(
                    pixels,
                    index,
                    blendChannel(readPixelChannel(pixels, index, 0), 8, overlayAmount),
                    blendChannel(readPixelChannel(pixels, index, 1), 12, overlayAmount),
                    blendChannel(readPixelChannel(pixels, index, 2), 18, overlayAmount),
                );
            }
        }
    }

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = y * width + x;
            const owner = owners[index];

            if (owner < 0) {
                continue;
            }

            const isBoundary =
                owners[index - 1] !== owner ||
                owners[index + 1] !== owner ||
                owners[index - width] !== owner ||
                owners[index + width] !== owner;

            if (isBoundary) {
                setPixel(
                    pixels,
                    index,
                    blendChannel(readPixelChannel(pixels, index, 0), 255, 0.72),
                    blendChannel(readPixelChannel(pixels, index, 1), 255, 0.72),
                    blendChannel(readPixelChannel(pixels, index, 2), 255, 0.72),
                );
            }
        }
    }

    return {
        type: "rendered",
        requestId,
        lightness,
        width,
        height,
        pixels,
        owners,
        flags,
        statistics,
        renderTimeMs: performance.now() - startedAt,
    };
}
