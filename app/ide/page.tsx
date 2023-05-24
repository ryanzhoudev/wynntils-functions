import prisma from "@/lib/prisma";
import IdeTextarea from "@/components/ui/ideTextarea";

export default async function IDE() {
    const functions = await prisma.function.findMany();

    return (
        <div className="text-white w-full h-screen">
            <IdeTextarea functions={functions} />
        </div>
    );
}
