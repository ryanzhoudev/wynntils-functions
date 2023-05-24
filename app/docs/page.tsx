import prisma from "../../lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Function } from ".prisma/client";

export async function makeContentCards(functions: Function[]) {
    if (functions == undefined) {
        return <div>Failed to load functions.</div>;
    }

    functions.sort((a, b) => a.id - b.id);

    const entries = [];

    // iterate through functions and create a div for each one
    for (const func of functions) {
        const parameters = await prisma.parameter.findMany({
            where: {
                functionId: func.id,
            },
        });

        // returns () if no parameters exist, otherwise returns (param1, param2, param3)
        const parameterSuffix = `(${parameters
            .map((param) => {
                if (param.required) {
                    return param.name;
                } else {
                    return param.name + "?";
                }
            })
            .join(";")})`;

        const entry = (
            <Card className="bg-gray-800" id={func.category}>
                <CardTitle>
                    <code className="ml-2 text-lg">
                        {func.name}
                        {parameterSuffix}
                    </code>
                    <code className="float-right mr-2 text-lg">{func.returnType}</code>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>

                <CardHeader>
                    <p>{parameters.length == 0 ? "No parameters" : "Parameters:"}</p>
                </CardHeader>
                <CardContent>
                    {parameters.map((param) => (
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
    const functions = await prisma.function.findMany();

    return await makeContentCards(functions);
}
