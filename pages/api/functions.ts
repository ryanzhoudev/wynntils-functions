import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export default async function handler(
    req: any,
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: {
                (
                    arg0: {
                        id: number;
                        name: string;
                        description: string;
                        aliases: string[];
                        returntype: $Enums.type;
                    }[],
                ): void;
                new (): any;
            };
        };
    },
) {
    const functions = await prisma.functions.findMany();
    res.status(200).json(functions);
}
