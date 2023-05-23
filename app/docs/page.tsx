import prisma from "../../lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Roboto_Mono } from "next/font/google";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default async function Docs() {
    const functions = await prisma.function.findMany();

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
            .join(", ")})`;

        const entry = (
            <Card className="bg-gray-800">
                <CardTitle>
                    <span className={robotoMono.className}>
                        <span className="ml-2">
                            {func.name}
                            {parameterSuffix}
                        </span>
                        <span className="float-right mr-2">{func.returnType}</span>
                    </span>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>

                <CardHeader>
                    <p>Parameters:</p>
                </CardHeader>
                <CardContent>
                    {parameters.map((param) => (
                        <div key={param.name}>
                            - <span className={robotoMono.className}>{param.name} </span> (
                            <span className={robotoMono.className}>{param.type}</span>,{" "}
                            {param.required ? "required" : "optional"})
                            {param.description == null ? "" : " -- " + param.description}
                        </div>
                    ))}
                </CardContent>

                <CardHeader>
                    <p>Aliases:</p>
                </CardHeader>
                <CardContent>
                    {func.aliases.map((alias) => (
                        <div key={alias}>
                            - <span className={robotoMono.className}>{alias}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );

        entries.push(entry);
    }

    return <div className="grid grid-cols-1 text-white bg-card text-card-foreground">{entries}</div>;
}
