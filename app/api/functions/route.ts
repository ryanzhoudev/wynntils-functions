import prisma from "@/lib/prisma";
import { FunctionCatalogResponse } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        const functions = await prisma.functions.findMany({
            include: {
                arguments: {
                    orderBy: [{ required: "desc" }, { id: "asc" }],
                },
            },
            orderBy: [{ name: "asc" }],
        });

        const payload: FunctionCatalogResponse = {
            functions: functions.map((fn) => ({
                id: fn.id,
                name: fn.name,
                description: fn.description,
                aliases: fn.aliases,
                returnType: fn.returntype,
                arguments: fn.arguments.map((arg) => ({
                    id: arg.id,
                    name: arg.name,
                    description: arg.description,
                    required: arg.required,
                    type: arg.type,
                    defaultValue: arg.defaultvalue,
                })),
            })),
            count: functions.length,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Failed to load function catalog", error);

        return NextResponse.json({ error: "Failed to load function catalog" }, { status: 500 });
    }
}
