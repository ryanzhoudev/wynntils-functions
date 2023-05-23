import prisma from "../../lib/prisma";
import { Roboto_Mono } from "next/font/google";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default async function Docs() {
    const functions = await prisma.function.findMany();

    if (functions == undefined) {
        return <div>Failed to load functions.</div>;
    }

    const entries = [];

    // iterate through functions and create a div for each one
    for (const func of functions) {
        const entry = (
            <Card className="bg-gray-800">
                <CardTitle>
                    <span className="ml-2">
                        <span className={robotoMono.className}>{func.name}</span>
                    </span>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>

                <CardHeader>
                    <p>Parameters:</p>
                </CardHeader>
                <CardContent>
                    {func.parameters.map((param) => (
                        <div key={param} className={robotoMono.className}>
                            - {param}
                        </div>
                    ))}
                </CardContent>

                <CardHeader>
                    <p>Aliases:</p>
                </CardHeader>
                <CardContent>
                    {func.aliases.map((alias) => (
                        <div key={alias} className={robotoMono.className}>
                            - {alias}
                        </div>
                    ))}
                </CardContent>
            </Card>
        );

        entries.push(entry);
    }

    return <div className="grid grid-cols-1 text-white bg-card text-card-foreground">{entries}</div>;
}
