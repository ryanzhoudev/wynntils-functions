import prisma from "@/lib/prisma";
import { Category } from "@prisma/client";
import { makeContentCards } from "@/app/docs/page";

async function getFunctions(category: string) {
    try {
        const categoryEnum = category as Category;
        return await prisma.function.findMany({
            where: {
                category: categoryEnum,
            },
        });
    } catch (error) {
        return await prisma.function.findMany({ take: 0 }); // return empty array if category is invalid
    }
}

export default async function CategorizedDocs({ params }: any) {
    const functions = await getFunctions(params.category);

    return await makeContentCards(functions);
}
