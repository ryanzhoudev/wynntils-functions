import { createAPIFileRoute } from "@tanstack/react-start/api";
import type { wynntilsargument, wynntilsfunction } from "@prisma/client";
import prisma from "@/lib/prisma";

export const APIRoute = createAPIFileRoute("/api/data")({
    GET: async () => {
        const fns: wynntilsfunction[] =
            await prisma.wynntilsfunction.findMany();
        const args: wynntilsargument[] =
            await prisma.wynntilsargument.findMany();

        return new Response(
            JSON.stringify({ functions: fns, arguments: args })
        );
    }
});
