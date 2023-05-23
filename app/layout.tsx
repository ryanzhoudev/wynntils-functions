import "./globals.css";
import React from "react";
import Link from "next/link";

export const metadata = {
    title: "Wynntils Function Reference",
    description: "A reference and IDE for all Wynntils info functions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-gray-800">
                <Sidebar />
                <div className="grid grid-cols-1 ml-48">{children}</div>
            </body>
        </html>
    );
}

function Sidebar() {
    const sections = [
        "Generic",
        "Character",
        "Combat",
        "Combat XP",
        "Environment",
        "Horse",
        "Inventory",
        "Lootrun",
        "Minecraft",
        "Profession",
        "Social",
        "Spell",
        "War",
        "World",
    ];

    return (
        <div className="flex flex-col fixed h-screen w-48 bg-blue-1000 text-xl font-bold text-white">
            {sections.map((section) => (
                <Link
                    key={section}
                    className="flex items-center justify-center h-14 hover:bg-blue-950"
                    href={"/docs#" + section}
                >
                    {section}
                </Link>
            ))}

            <div className="flex flex-grow"></div>

            <Link className="flex items-center justify-center h-14 bg-blue-1050 hover:bg-blue-950" href={"/ide"}>
                IDE
            </Link>
        </div>
    );
}
