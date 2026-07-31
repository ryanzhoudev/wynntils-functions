import GuildColorMap from "@/components/guild-color-map";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Guild Color Claim Map | Wynntils Functions",
    description: "Explore allowed and guild-claimed Wynntils colors in perceptual color space",
};

export default function GuildColorMapPage() {
    return <GuildColorMap />;
}
