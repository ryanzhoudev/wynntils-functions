import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
    title: "Wynntils Functions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-gray-800">
                {children}
                <Analytics />
            </body>
        </html>
    );
}
