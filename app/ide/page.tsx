import prisma from "@/lib/prisma";
import IdeTextarea from "@/components/ui/ideTextarea";

export default async function IDE() {
    const functions = await prisma.function.findMany();
    const parameters = await prisma.parameter.findMany();

    return (
        <div className="text-white w-full h-screen">
            <IdeTextarea functions={functions} parameters={parameters} />
        </div>
    );
}
