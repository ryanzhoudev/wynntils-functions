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
    const sections: Record<string, string> = {
        "Generic Capped": "GenericCapped",
        "Generic Conditional": "GenericConditional",
        "Generic Location": "GenericLocation",
        "Generic Logic": "GenericLogic",
        "Generic Math": "GenericMath",
        "Generic String": "GenericString",
        Character: "Character",
        Combat: "Combat",
        "Combat XP": "CombatXp",
        Environment: "Environment",
        Horse: "Horse",
        Inventory: "Inventory",
        Lootrun: "Lootrun",
        Minecraft: "Minecraft",
        Profession: "Profession",
        Social: "Social",
        Spell: "Spell",
        War: "War",
        World: "World",
    };

    return (
        <div className="flex flex-col fixed h-screen w-48 bg-blue-1000 text-lg text-white">
            {Object.entries(sections).map(([section, category]) => (
                <Link
                    key={section}
                    className="flex items-center justify-start h-10 hover:bg-blue-950 border-b border-gray-600"
                    href={"/docs/" + category}
                >
                    <p className="ml-2">{section}</p>
                </Link>
            ))}

            <div className="flex flex-grow"></div>

            <Link
                className="flex items-center justify-center h-14 bg-blue-1050 font-bold hover:bg-blue-950"
                href={"/ide"}
            >
                Open IDE
            </Link>
        </div>
    );
}
