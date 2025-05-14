import dynamic from "next/dynamic";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";

const Docs = dynamic(() => import("@/components/docs"), { ssr: false });

export async function getStaticProps() {
    const functions = await prisma.functions.findMany();
    const args = await prisma.arguments.findMany();

    return {
        props: {
            functions: JSON.parse(JSON.stringify(functions)),
            args: JSON.parse(JSON.stringify(args)),
        },
    };
}

export default function FunctionsPage({ functions, args }: any) {
    const filters = [
        {
            id: "fn_name",
            label: "Function names & aliases",
            apply: (fn: any, query: string) =>
                (fn.name + " " + fn.aliases.join(" ")).toLowerCase().includes(query.toLowerCase()),
            defaultChecked: true,
        },
        {
            id: "fn_desc",
            label: "Function descriptions",
            apply: (fn: any, query: string) => fn.description.toLowerCase().includes(query.toLowerCase()),
            defaultChecked: true,
        },
        {
            id: "fn_return",
            label: "Function return types",
            apply: (fn: any, query: string) => fn.returntype.toLowerCase().includes(query.toLowerCase()),
            defaultChecked: false,
        },
        {
            id: "arg_names",
            label: "Argument names",
            apply: (fn: any, query: string) =>
                args
                    .filter((arg: any) => arg.functionid === fn.id)
                    .some((arg: any) => arg.name.toLowerCase().includes(query.toLowerCase())),
            defaultChecked: false,
        },
        {
            id: "arg_descs",
            label: "Argument descriptions",
            apply: (fn: any, query: string) =>
                args
                    .filter((arg: any) => arg.functionid === fn.id)
                    .some((arg: any) => (arg.description ?? "").toLowerCase().includes(query.toLowerCase())),
            defaultChecked: false,
        },
    ];

    const renderCard = (func: any) => {
        const filteredArgs = args.filter((arg: any) => arg.functionid === func.id);
        const argSuffix =
            filteredArgs.length === 0
                ? ""
                : "(" + filteredArgs.map((arg: any) => (arg.required ? arg.name : arg.name + "?")).join("; ") + ")";

        return (
            <Card key={func.id} className="bg-gray-800">
                <CardTitle>
                    <code className="ml-2 text-lg">
                        {func.name}
                        {argSuffix}
                    </code>
                    <code className="float-right mr-2 text-lg">{func.returntype}</code>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>
                <CardHeader>
                    <p>{filteredArgs.length === 0 ? "No arguments" : "Arguments:"}</p>
                </CardHeader>
                <CardContent>
                    {filteredArgs.map((arg: any) => (
                        <div key={arg.name}>
                            - <code>{arg.name}</code> (<code>{arg.type}</code>
                            {", "}
                            {arg.required ? "required" : "optional, default: " + arg.defaultvalue})
                            {arg.description ? ` -- ${arg.description}` : ""}
                        </div>
                    ))}
                </CardContent>
                <CardHeader>
                    <p>{func.aliases.length === 0 ? "No aliases" : "Aliases:"}</p>
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
    };

    return <Docs data={functions} filters={filters} renderAction={renderCard} />;
}
