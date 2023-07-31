import "./globals.css";
import React from "react";

export const metadata = {
    title: "Wynntils Functions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-gray-800">{children}</body>
        </html>
    );
}
