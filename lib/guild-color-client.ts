import {
    type GuildColorApiResponse,
    type GuildColorStatsApiResponse,
    mergeGuildColorStats,
} from "@/lib/guild-colors";

export type GuildColorDataPhase = "colors" | "stats";

function parseApiError(payload: unknown, fallback: string): string {
    if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
        return payload.error;
    }

    return fallback;
}

async function readJson(response: Response): Promise<unknown> {
    return response.json();
}

export async function loadGuildColorData(
    signal: AbortSignal,
    onData: (data: GuildColorApiResponse, phase: GuildColorDataPhase) => void,
    onStatsUnavailable?: (message: string) => void,
): Promise<void> {
    const colorResponse = await fetch("/api/guild-colors", {
        headers: {
            Accept: "application/json",
        },
        signal,
    });
    const colorPayload = await readJson(colorResponse);

    if (!colorResponse.ok) {
        throw new Error(parseApiError(colorPayload, "Guild color data is temporarily unavailable."));
    }

    const colors = colorPayload as GuildColorApiResponse;
    onData(colors, "colors");

    try {
        const statsResponse = await fetch("/api/guild-color-stats", {
            headers: {
                Accept: "application/json",
            },
            signal,
        });
        const statsPayload = await readJson(statsResponse);

        if (!statsResponse.ok) {
            throw new Error(parseApiError(statsPayload, "Guild activity statistics are temporarily unavailable."));
        }

        if (!signal.aborted) {
            onData(mergeGuildColorStats(colors, statsPayload as GuildColorStatsApiResponse), "stats");
        }
    } catch (error) {
        if (!signal.aborted) {
            console.warn("Failed to load optional guild activity statistics", error);
            onStatsUnavailable?.(
                error instanceof Error ? error.message : "Guild activity statistics are temporarily unavailable.",
            );
        }
    }
}
