import prisma from "@/lib/prisma";
import { Category } from "@prisma/client";
import { makeContentCards } from "@/app/docs/page";

async function getFunctions(category: string) {
    return await prisma.function.findMany({
        where: {
            category: category as Category,
        },
    });
}

export default async function CategorizedDocs({ params }: any) {
    const functions = await getFunctions(params.category);

    return await makeContentCards(functions);
}
