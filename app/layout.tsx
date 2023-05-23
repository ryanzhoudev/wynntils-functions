import "./globals.css";
import { Roboto } from "next/font/google";
import React from "react";
import Link from "next/link";

const roboto = Roboto({
    weight: "400",
    subsets: ["latin"],
});

export const metadata = {
    title: "Wynntils Function Reference",
    description: "A reference and IDE for all Wynntils info functions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={roboto.className}>
                <SideBar />
                {children}
            </body>
        </html>
    );
}

function SideBar() {
    return (
        <div className="flex flex-col h-screen w-48 bg-blue-1000 text-xl font-bold text-white">
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Generic"}>
                Generic
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Character"}>
                Character
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Combat"}>
                Combat
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#CombatXP"}>
                Combat XP
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Environment"}>
                Environment
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Horse"}>
                Horse
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Inventory"}>
                Inventory
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Lootrun"}>
                Lootrun
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Minecraft"}>
                Minecraft
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Profession"}>
                Profession
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Social"}>
                Social
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#Spell"}>
                Spell
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#War"}>
                War
            </Link>
            <Link className="flex items-center justify-center h-14 hover:bg-blue-950" href={"/docs#World"}>
                World
            </Link>

            <div className="flex flex-grow"></div>

            <Link className="flex items-center justify-center h-14 bg-blue-1050 hover:bg-blue-950" href={"/ide"}>
                IDE
            </Link>
        </div>
    );
}
