import { guildStatsUrl, type GuildColorRecord, type GuildColorStatsMetadata } from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface GuildStatsLinkProps {
    guild: GuildColorRecord;
    seasons: Pick<GuildColorStatsMetadata, "currentSeason" | "previousSeason"> | null;
    className?: string;
}

const SEASON_RATING_HIGHLIGHT_THRESHOLD = 10_000;

function formatStat(value: number | null | undefined): string {
    return value == null ? "—" : value.toLocaleString();
}

function seasonRatingClassName(value: number | null | undefined): string {
    return cn(
        "font-medium tabular-nums text-foreground/75",
        value != null && value < SEASON_RATING_HIGHLIGHT_THRESHOLD && "text-rose-300/80",
    );
}

export default function GuildStatsLink({ guild, seasons, className }: GuildStatsLinkProps) {
    const territoryCount = guild.stats?.currentTerritories;
    const currentSeasonRating = guild.stats?.currentSeasonRating;
    const previousSeasonRating = guild.stats?.previousSeasonRating;
    const metrics = [
        ...(seasons?.previousSeason
            ? [
                  {
                      key: "previous-season",
                      label: "Previous",
                      seasonId: seasons.previousSeason.id,
                      value: `${formatStat(previousSeasonRating)} SR`,
                      valueClassName: seasonRatingClassName(previousSeasonRating),
                  },
              ]
            : []),
        {
            key: "territories",
            label: territoryCount === 1 ? "Terr" : "Terrs",
            seasonId: null,
            value: formatStat(territoryCount),
            valueClassName: "font-medium tabular-nums text-foreground/75",
        },
        ...(seasons?.currentSeason
            ? [
                  {
                      key: "current-season",
                      label: "Current",
                      seasonId: seasons.currentSeason.id,
                      value: `${formatStat(currentSeasonRating)} SR`,
                      valueClassName: seasonRatingClassName(currentSeasonRating),
                  },
              ]
            : []),
    ];

    return (
        <span className={cn("inline-flex w-full min-w-0 max-w-sm flex-col items-start gap-1", className)}>
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
            <span
                className="grid w-full text-xs leading-snug text-muted-foreground"
                style={{
                    gridTemplateColumns: metrics
                        .map((metric) => `minmax(0, ${metric.key === "territories" ? 0.65 : 1.35}fr)`)
                        .join(" "),
                }}
            >
                {metrics.map((metric, index) => (
                    <span
                        key={metric.key}
                        className={cn(
                            "min-w-0",
                            index > 0 && "border-l border-border/60 pl-2",
                            index < metrics.length - 1 && "pr-2",
                        )}
                    >
                        <span className="block truncate text-[0.625rem] font-medium leading-tight text-muted-foreground/75">
                            {metric.label}
                            {metric.seasonId ? (
                                <>
                                    {" "}
                                    <span className="font-semibold text-foreground/75">S{metric.seasonId}</span>
                                </>
                            ) : null}
                        </span>
                        <span className={cn("block truncate", metric.valueClassName)}>{metric.value}</span>
                    </span>
                ))}
            </span>
        </span>
    );
}
