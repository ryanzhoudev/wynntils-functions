import GuildColorTool from "@/components/guild-color-tool";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Guild Color Lab | Wynntils Functions",
    description:
        "Preview a Wynncraft guild color and compare it with existing guild colors using the Wynntils Bot checks.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value ?? null;
}

export default async function GuildColorPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const initialColor = firstValue(params.hex) ?? firstValue(params.color);

    return <GuildColorTool initialColor={initialColor} />;
}
