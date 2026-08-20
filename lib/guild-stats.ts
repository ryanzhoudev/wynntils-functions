import type { GuildColorRecord, GuildColorStats, GuildSeasonMetadata } from "@/lib/guild-colors";

export const GUILD_SEASON_LEADERBOARD_LIMIT = 1000;

export interface GuildDirectoryEntry {
    name: string;
    prefix: string;
    uuid: string;
}

export interface GuildSeasonSelection {
    current: GuildSeasonMetadata | null;
    previous: GuildSeasonMetadata | null;
}

export interface GuildSeasonLeaderboard {
    ratings: Map<string, number>;
    complete: boolean;
}

interface GuildStatsSources {
    directory: GuildDirectoryEntry[] | null;
    territoryCounts: Map<string, number> | null;
    currentSeasonLeaderboard: GuildSeasonLeaderboard | null;
    previousSeasonLeaderboard: GuildSeasonLeaderboard | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizedGuildName(value: string): string {
    return value.trim().toLocaleLowerCase();
}

function normalizedGuildPrefix(value: string): string {
    return value.trim().toLocaleUpperCase();
}

export function parseGuildDirectory(payload: unknown): GuildDirectoryEntry[] {
    if (!isRecord(payload)) {
        throw new Error("Wynncraft returned an unexpected guild-directory shape.");
    }

    return Object.entries(payload).flatMap(([name, value]) => {
        if (!isRecord(value)) {
            return [];
        }

        const uuid = readString(value.uuid);
        const prefix = readString(value.prefix);

        return uuid && prefix ? [{ name, prefix, uuid }] : [];
    });
}

export function resolveGuildUuid(guild: GuildColorRecord, directory: GuildDirectoryEntry[]): string | null {
    const candidates = directory.filter((entry) => normalizedGuildName(entry.name) === normalizedGuildName(guild.name));
    const exactNameMatches = candidates.filter((entry) => entry.name === guild.name);

    if (exactNameMatches.length === 1) {
        return exactNameMatches[0].uuid;
    }

    const prefixMatches = candidates.filter(
        (entry) => normalizedGuildPrefix(entry.prefix) === normalizedGuildPrefix(guild.prefix),
    );

    if (prefixMatches.length === 1) {
        return prefixMatches[0].uuid;
    }

    return candidates.length === 1 ? candidates[0].uuid : null;
}

function parseSeasonDate(value: unknown): { iso: string; timestamp: number } | null {
    const source = readString(value);

    if (!source) {
        return null;
    }

    const timestamp = Date.parse(source);

    return Number.isFinite(timestamp) ? { iso: new Date(timestamp).toISOString(), timestamp } : null;
}

export function selectGuildSeasons(payload: unknown, now = Date.now()): GuildSeasonSelection {
    if (!isRecord(payload)) {
        throw new Error("Wynncraft returned an unexpected guild-season shape.");
    }

    const seasons = Object.entries(payload).flatMap(([id, value]) => {
        if (!isRecord(value)) {
            return [];
        }

        const start = parseSeasonDate(value.startDate ?? value.initDate);
        const end = parseSeasonDate(value.endDate);

        if (!start || !end || end.timestamp <= start.timestamp) {
            return [];
        }

        return [
            {
                metadata: {
                    id,
                    startAt: start.iso,
                    endAt: end.iso,
                },
                start: start.timestamp,
                end: end.timestamp,
            },
        ];
    });
    const current = seasons
        .filter((season) => season.start <= now && now < season.end)
        .sort((first, second) => second.start - first.start)[0];
    const previous = seasons.filter((season) => season.end <= now).sort((first, second) => second.end - first.end)[0];

    return {
        current: current?.metadata ?? null,
        previous: previous?.metadata ?? null,
    };
}

export function parseGuildTerritoryCounts(payload: unknown): Map<string, number> {
    if (!isRecord(payload)) {
        throw new Error("Wynncraft returned an unexpected territory-list shape.");
    }

    const counts = new Map<string, number>();

    for (const territory of Object.values(payload)) {
        if (!isRecord(territory) || !isRecord(territory.guild)) {
            continue;
        }

        const uuid = readString(territory.guild.uuid);

        if (uuid) {
            counts.set(uuid, (counts.get(uuid) ?? 0) + 1);
        }
    }

    return counts;
}

export function parseGuildSeasonLeaderboard(
    payload: unknown,
    resultLimit = GUILD_SEASON_LEADERBOARD_LIMIT,
): GuildSeasonLeaderboard {
    if (!isRecord(payload)) {
        throw new Error("Wynncraft returned an unexpected guild-season leaderboard shape.");
    }

    const entries = Object.values(payload);
    const ratings = new Map<string, number>();

    for (const entry of entries) {
        if (!isRecord(entry)) {
            continue;
        }

        const uuid = readString(entry.uuid);
        const rating = typeof entry.score === "number" ? entry.score : Number.NaN;

        if (uuid && Number.isFinite(rating) && rating >= 0) {
            ratings.set(uuid, Math.max(ratings.get(uuid) ?? 0, rating));
        }
    }

    return {
        ratings,
        complete: entries.length < resultLimit,
    };
}

function readSeasonRating(uuid: string, leaderboard: GuildSeasonLeaderboard | null): number | null {
    if (!leaderboard) {
        return null;
    }

    return leaderboard.ratings.get(uuid) ?? (leaderboard.complete ? 0 : null);
}

export function enrichGuildColorStats(guilds: GuildColorRecord[], sources: GuildStatsSources): GuildColorRecord[] {
    return guilds.map((guild) => {
        const uuid = sources.directory ? resolveGuildUuid(guild, sources.directory) : null;
        const stats: GuildColorStats = {
            currentTerritories: uuid && sources.territoryCounts ? (sources.territoryCounts.get(uuid) ?? 0) : null,
            currentSeasonRating: uuid ? readSeasonRating(uuid, sources.currentSeasonLeaderboard) : null,
            previousSeasonRating: uuid ? readSeasonRating(uuid, sources.previousSeasonLeaderboard) : null,
        };

        return { ...guild, stats };
    });
}
