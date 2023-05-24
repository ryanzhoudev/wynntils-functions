import { Roboto_Mono } from "next/font/google";
import prisma from "@/lib/prisma";
import IdeTextarea from "@/components/ui/ideTextarea";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default async function IDE() {
    const functions = await prisma.function.findMany();

    return (
        <div className="text-white w-full h-screen">
            <IdeTextarea functions={functions} />
        </div>
    );
}
