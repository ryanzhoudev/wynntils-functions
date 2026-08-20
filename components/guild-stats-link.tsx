import { guildStatsUrl, type GuildColorApiResponse, type GuildColorRecord } from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface GuildStatsLinkProps {
    guild: GuildColorRecord;
    seasons: Pick<GuildColorApiResponse["stats"], "currentSeason" | "previousSeason"> | null;
    className?: string;
}

const SEASON_RATING_HIGHLIGHT_THRESHOLD = 10_000;

function formatStat(value: number | null | undefined): string {
    return value == null ? "—" : value.toLocaleString();
}

function seasonRatingClassName(value: number | null | undefined): string {
    return cn(
        "tabular-nums",
        value != null && value < SEASON_RATING_HIGHLIGHT_THRESHOLD && "text-rose-300/80",
    );
}

export default function GuildStatsLink({ guild, seasons, className }: GuildStatsLinkProps) {
    const territoryCount = guild.stats?.currentTerritories;
    const currentSeasonRating = guild.stats?.currentSeasonRating;
    const previousSeasonRating = guild.stats?.previousSeasonRating;

    return (
        <span className={cn("inline-flex min-w-0 flex-col items-start gap-0.5", className)}>
            <a
                href={guildStatsUrl(guild.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {guild.name} [{guild.prefix.toUpperCase()}]
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
            </a>
            <span className="text-xs leading-snug text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground/75">{formatStat(territoryCount)}</span>{" "}
                {territoryCount === 1 ? "territory" : "territories"}
                {seasons?.currentSeason ? (
                    <>
                        {" · "}
                        <span className="font-semibold text-foreground/80">S{seasons.currentSeason.id}</span>{" "}
                        <span className={seasonRatingClassName(currentSeasonRating)}>
                            {formatStat(currentSeasonRating)} SR
                        </span>
                    </>
                ) : null}
                {seasons?.previousSeason ? (
                    <>
                        {" · "}
                        <span className="font-semibold text-foreground/80">S{seasons.previousSeason.id}</span>{" "}
                        <span className={seasonRatingClassName(previousSeasonRating)}>
                            {formatStat(previousSeasonRating)} SR
                        </span>
                    </>
                ) : null}
            </span>
        </span>
    );
}
