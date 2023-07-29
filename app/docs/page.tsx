import prisma from "../../lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { arguments, functions } from ".prisma/client";

async function makeContentCards(functions: functions[], args: arguments[]) {
    if (functions == undefined || args == undefined) {
        return <div>Failed to load functions or arguments.</div>;
    }

    functions.sort((a, b) => a.id - b.id);

    const entries = [];

    // iterate through functions and create a div for each one
    for (const func of functions) {
        const filteredArgs = args.filter((arg) => arg.functionid == func.id);

        // returns "" if no filteredArgs exist, otherwise returns (arg1, arg2, arg3)
        const argumentSuffix =
            filteredArgs.length == 0
                ? ""
                : "(" +
                  filteredArgs
                      .map((arg) => {
                          return arg.required ? arg.name : arg.name + "?";
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
                    <p>{filteredArgs.length == 0 ? "No arguments" : "Arguments:"}</p>
                </CardHeader>
                <CardContent>
                    {filteredArgs.map((arg) => (
                        <div key={arg.name}>
                            - <code>{arg.name} </code> (<code>{arg.type}</code>
                            {", "}
                            {arg.required ? "required" : "optional, default: " + arg.defaultvalue})
                            {arg.description == null ? "" : " -- " + arg.description}
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
    const args = await prisma.arguments.findMany();

    return await makeContentCards(functions, args);
}
