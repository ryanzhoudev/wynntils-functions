import {
    type GuildColorStatsApiResponse,
    type GuildSeasonMetadata,
    parseAthenaGuildColors,
} from "@/lib/guild-colors";
import {
    enrichGuildColorStats,
    GUILD_SEASON_LEADERBOARD_LIMIT,
    parseGuildDirectory,
    parseGuildSeasonLeaderboard,
    parseGuildTerritoryCounts,
    selectGuildSeasons,
    type GuildSeasonLeaderboard,
} from "@/lib/guild-stats";
import { connection, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

const ATHENA_GUILD_LIST_URL = "https://athena.wynntils.com/cache/get/guildList";
const WYNNCRAFT_GUILD_DIRECTORY_URL = "https://api.wynncraft.com/v3/guild/list/guild";
const WYNNCRAFT_TERRITORY_LIST_URL = "https://api.wynncraft.com/v3/guild/list/territory";
const WYNNCRAFT_GUILD_SEASONS_URL = "https://api.wynncraft.com/v3/guild/seasons";
const WYNNCRAFT_LEADERBOARD_BASE_URL = "https://api.wynncraft.com/v3/leaderboards";
const COLOR_CACHE_SECONDS = 10 * 60;
const STATS_CACHE_SECONDS = 60;
const SEASON_CACHE_SECONDS = 10 * 60;

interface UpstreamJson {
    payload: unknown;
}

async function fetchJson(url: string, cacheSeconds: number): Promise<UpstreamJson> {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
        },
        next: {
            revalidate: cacheSeconds,
        },
    });

    if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}.`);
    }

    return {
        payload: await response.json(),
    };
}

function parseOptionalResult<T>(
    result: PromiseSettledResult<UpstreamJson>,
    label: string,
    parse: (payload: unknown) => T,
): T | null {
    if (result.status === "rejected") {
        console.warn(`Failed to load optional ${label} data`, result.reason);
        return null;
    }

    try {
        return parse(result.value.payload);
    } catch (error) {
        console.warn(`Failed to parse optional ${label} data`, error);
        return null;
    }
}

async function fetchSeasonLeaderboard(season: GuildSeasonMetadata | null): Promise<GuildSeasonLeaderboard | null> {
    if (!season) {
        return null;
    }

    const url = `${WYNNCRAFT_LEADERBOARD_BASE_URL}/guildSeason${encodeURIComponent(season.id)}?resultLimit=${GUILD_SEASON_LEADERBOARD_LIMIT}`;
    const { payload } = await fetchJson(url, SEASON_CACHE_SECONDS);

    return parseGuildSeasonLeaderboard(payload);
}

function readOptionalLeaderboard(
    result: PromiseSettledResult<GuildSeasonLeaderboard | null>,
    label: string,
): GuildSeasonLeaderboard | null {
    if (result.status === "rejected") {
        console.warn(`Failed to load optional ${label} leaderboard`, result.reason);
        return null;
    }

    return result.value;
}

export async function GET() {
    await connection();

    try {
        const [athenaResult, directoryResult, territoryResult, seasonsResult] = await Promise.allSettled([
            fetchJson(ATHENA_GUILD_LIST_URL, COLOR_CACHE_SECONDS),
            fetchJson(WYNNCRAFT_GUILD_DIRECTORY_URL, SEASON_CACHE_SECONDS),
            fetchJson(WYNNCRAFT_TERRITORY_LIST_URL, STATS_CACHE_SECONDS),
            fetchJson(WYNNCRAFT_GUILD_SEASONS_URL, SEASON_CACHE_SECONDS),
        ]);

        if (athenaResult.status === "rejected") {
            throw athenaResult.reason;
        }

        const { guilds: parsedGuilds } = parseAthenaGuildColors(athenaResult.value.payload);

        if (parsedGuilds.length === 0) {
            throw new Error("Athena returned no usable guild colors.");
        }

        const directory = parseOptionalResult(directoryResult, "guild directory", parseGuildDirectory);
        const territoryCounts = parseOptionalResult(territoryResult, "guild territory", parseGuildTerritoryCounts);
        const seasons = parseOptionalResult(seasonsResult, "guild season", selectGuildSeasons) ?? {
            current: null,
            previous: null,
        };
        const [currentLeaderboardResult, previousLeaderboardResult] = await Promise.allSettled([
            fetchSeasonLeaderboard(seasons.current),
            fetchSeasonLeaderboard(seasons.previous),
        ]);
        const guilds = enrichGuildColorStats(parsedGuilds, {
            directory,
            territoryCounts,
            currentSeasonLeaderboard: readOptionalLeaderboard(currentLeaderboardResult, "current-season"),
            previousSeasonLeaderboard: readOptionalLeaderboard(previousLeaderboardResult, "previous-season"),
        });
        const payload: GuildColorStatsApiResponse = {
            guilds: guilds.map((guild) => ({
                name: guild.name,
                prefix: guild.prefix,
                wynncraftIdentityResolved: guild.wynncraftIdentityResolved ?? null,
                stats: guild.stats ?? {
                    currentTerritories: null,
                    currentSeasonRating: null,
                    previousSeasonRating: null,
                },
            })),
            fetchedAt: Date.now(),
            cacheSeconds: STATS_CACHE_SECONDS,
            currentSeason: seasons.current,
            previousSeason: seasons.previous,
        };

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": `public, max-age=0, s-maxage=${STATS_CACHE_SECONDS}, stale-while-revalidate=60`,
            },
        });
    } catch (error) {
        console.error("Failed to load guild color statistics", error);

        return NextResponse.json(
            {
                error: "Guild activity statistics are temporarily unavailable.",
            },
            {
                status: 502,
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    }
}
