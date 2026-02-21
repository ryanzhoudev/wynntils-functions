import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Wynntils Functions",
    description: "Function reference for Wynntils/Artemis expression helpers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background text-foreground antialiased">
                {children}
                <Analytics />
            </body>
        </html>
    );
}
