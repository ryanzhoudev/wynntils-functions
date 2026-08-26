import GuildColorMap from "@/components/guild-color-map";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Guild Color Claim Map | Wynntils Functions",
    description: "Explore allowed and guild-claimed Wynntils colors in perceptual color space",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value ?? null;
}

export default async function GuildColorMapPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const initialColor = firstValue(params.hex) ?? firstValue(params.color);
    const initialIgnoreLowActivity = firstValue(params.ignoreLowActivity) === "1";

    return <GuildColorMap initialColor={initialColor} initialIgnoreLowActivity={initialIgnoreLowActivity} />;
}
