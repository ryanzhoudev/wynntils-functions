import dynamic from "next/dynamic";
import prisma from "@/lib/prisma";
import Card from "@/components/docs/card";
import { wynntilsargument, wynntilsfunction } from "@prisma/client";

const Docs = dynamic(() => import("@/components/docs/docs"), { ssr: false });

export async function getStaticProps() {
    const functions: wynntilsfunction[] = await prisma.wynntilsfunction.findMany();
    const args: wynntilsargument[] = await prisma.wynntilsargument.findMany();

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

    const renderCard = (func: wynntilsfunction) => {
        const filteredArgs: wynntilsargument[] = args.filter((arg: any) => arg.functionid === func.id);
        const argSuffix: string =
            filteredArgs.length === 0
                ? ""
                : "(" + filteredArgs.map((arg: any) => (arg.required ? arg.name : arg.name + "?")).join("; ") + ")";

        return Card(func, filteredArgs, argSuffix);
    };

    return <Docs data={functions} filters={filters} renderAction={renderCard} />;
}
