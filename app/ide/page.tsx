import { Roboto_Mono } from "next/font/google";
import prisma from "@/lib/prisma";
import IdeTextarea from "@/components/ui/ideTextarea";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default async function IDE() {
    let functionNames: string[] = [];

    const functions = await prisma.function.findMany();
    if (functions != undefined) {
        functionNames = functions.map((func) => func.name);
    }

    return (
        <div className="bg-gray-800 text-white w-full h-screen">
            <IdeTextarea functionNames={functionNames} />
        </div>
    );
}
