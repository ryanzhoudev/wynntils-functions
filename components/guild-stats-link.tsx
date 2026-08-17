import { guildStatsUrl, GuildColorRecord } from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface GuildStatsLinkProps {
    guild: GuildColorRecord;
    className?: string;
}

export default function GuildStatsLink({ guild, className }: GuildStatsLinkProps) {
    return (
        <a
            href={guildStatsUrl(guild.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "inline-flex items-center gap-1 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className,
            )}
        >
            {guild.name} [{guild.prefix.toUpperCase()}]
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
        </a>
    );
}
