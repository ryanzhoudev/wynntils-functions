import prisma from "@/lib/prisma";
import { FunctionCatalogResponse } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeAliases(aliases: string[]) {
    return Array.from(new Set(aliases.map((alias) => alias.trim()).filter((alias) => alias.length > 0)));
}

export async function GET() {
    try {
        const [functions, dataVersion] = await Promise.all([
            prisma.wynntilsFunction.findMany({
                include: {
                    arguments: {
                        orderBy: [{ required: "desc" }, { id: "asc" }],
                    },
                },
                orderBy: [{ name: "asc" }],
            }),
            prisma.wynntilsDataVersion.findFirst({
                orderBy: [{ id: "desc" }],
            }),
        ]);

        const payload: FunctionCatalogResponse = {
            functions: functions.map((fn) => ({
                id: fn.id,
                name: fn.name,
                description: fn.description,
                aliases: normalizeAliases(fn.aliases),
                returnType: fn.returnType,
                arguments: fn.arguments.map((arg) => ({
                    id: arg.id,
                    name: arg.name,
                    description: arg.description,
                    required: arg.required,
                    type: arg.type,
                    defaultValue: arg.defaultValue,
                })),
            })),
            count: functions.length,
            dataVersion: dataVersion?.modVersion ?? null,
            harvestedAt: dataVersion ? Number(dataVersion.harvestedAt) : null,
        };

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Failed to load function catalog", error);

        return NextResponse.json(
            {
                error: "Failed to load function catalog",
                dataVersion: null,
                harvestedAt: null,
            },
            { status: 500 },
        );
    }
}
