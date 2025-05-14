import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export default async function handler(
    req: any,
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: {
                (arg0: {
                    functions: {
                        id: number;
                        name: string;
                        description: string;
                        aliases: string[];
                        returntype: $Enums.type;
                    }[];
                    args: {
                        id: number;
                        name: string;
                        description: string;
                        required: boolean;
                        functionid: number | null;
                        type: $Enums.type;
                        defaultvalue: string | null;
                    }[];
                }): void;
                new (): any;
            };
        };
    },
) {
    const functions = await prisma.functions.findMany();
    const args = await prisma.arguments.findMany();

    res.status(200).json({ functions, args });
}
