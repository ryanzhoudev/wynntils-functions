import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
    title: "Wynntils Functions",
    description: "Unofficial functions reference and IDE for Wynntils",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background text-foreground antialiased">
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
