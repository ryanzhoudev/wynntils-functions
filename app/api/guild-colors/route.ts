import { type GuildColorApiResponse, parseAthenaGuildColors } from "@/lib/guild-colors";
import { connection, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600;

const ATHENA_GUILD_LIST_URL = "https://athena.wynntils.com/cache/get/guildList";
const CACHE_SECONDS = 10 * 60;

function readFetchedAt(response: Response): number {
    const timestamp = Number(response.headers.get("timestamp"));

    return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : Date.now();
}

export async function GET() {
    await connection();

    try {
        const upstreamResponse = await fetch(ATHENA_GUILD_LIST_URL, {
            headers: {
                Accept: "application/json",
            },
            next: {
                revalidate: CACHE_SECONDS,
            },
        });

        if (!upstreamResponse.ok) {
            throw new Error(`Athena returned HTTP ${upstreamResponse.status}.`);
        }

        const { guilds } = parseAthenaGuildColors(await upstreamResponse.json());

        if (guilds.length === 0) {
            throw new Error("Athena returned no usable guild colors.");
        }

        const payload: GuildColorApiResponse = {
            guilds,
            fetchedAt: readFetchedAt(upstreamResponse),
            cacheSeconds: CACHE_SECONDS,
            stats: null,
            source: {
                url: ATHENA_GUILD_LIST_URL,
                etag: upstreamResponse.headers.get("etag"),
                freshness: "request-time-only",
            },
        };

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
            },
        });
    } catch (error) {
        console.error("Failed to load guild colors from Athena", error);

        return NextResponse.json(
            {
                error: "Guild color data is temporarily unavailable. No verdict was calculated.",
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
