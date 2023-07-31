import prisma from "@/lib/prisma";
import Docs from "@/components/docs";

export default async function Page() {
    const functions = await prisma.functions.findMany();
    const args = await prisma.arguments.findMany();

    return <Docs functions={functions} args={args} />;
}
