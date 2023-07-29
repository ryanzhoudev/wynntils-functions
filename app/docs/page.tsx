import prisma from "../../lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { functions } from ".prisma/client";

async function makeContentCards(functions: functions[]) {
    if (functions == undefined) {
        return <div>Failed to load functions.</div>;
    }

    functions.sort((a, b) => a.id - b.id);

    const entries = [];

    // iterate through functions and create a div for each one
    for (const func of functions) {
        const args = await prisma.arguments.findMany({
            where: {
                functionid: func.id,
            },
        });

        // returns "" if no args exist, otherwise returns (param1, param2, param3)
        const argumentSuffix =
            args.length == 0
                ? ""
                : "(" +
                  args
                      .map((param) => {
                          return param.required ? param.name : param.name + "?";
                      })
                      .join("; ") +
                  ")";

        const entry = (
            <Card className="bg-gray-800">
                <CardTitle>
                    <code className="ml-2 text-lg">
                        {func.name}
                        {argumentSuffix}
                    </code>
                    <code className="float-right mr-2 text-lg">{func.returntype}</code>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>

                <CardHeader>
                    <p>{args.length == 0 ? "No args" : "Arguments:"}</p>
                </CardHeader>
                <CardContent>
                    {args.map((param) => (
                        <div key={param.name}>
                            - <code>{param.name} </code> (<code>{param.type}</code>
                            {", "}
                            {param.required ? "required" : "optional"})
                            {param.description == null ? "" : " -- " + param.description}
                        </div>
                    ))}
                </CardContent>

                <CardHeader>
                    <p>{func.aliases.length == 0 ? "No aliases" : "Aliases:"}</p>
                </CardHeader>
                <CardContent>
                    {func.aliases.map((alias: string) => (
                        <div key={alias}>
                            - <code>{alias}</code>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );

        entries.push(entry);
    }

    return <div className="grid grid-cols-1 text-white bg-card text-card-foreground">{entries}</div>;
}

export default async function Docs() {
    const functions = await prisma.functions.findMany();

    return await makeContentCards(functions);
}
