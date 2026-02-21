"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/legacy/card";
import { FunctionEntry } from "@/lib/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import Link from "next/link";
import { useMemo, useState } from "react";

type LegacyFilterState = {
    functionNames: boolean;
    functionDescriptions: boolean;
    functionReturnTypes: boolean;
    argumentNames: boolean;
    argumentDescriptions: boolean;
};

const DEFAULT_FILTERS: LegacyFilterState = {
    functionNames: true,
    functionDescriptions: true,
    functionReturnTypes: false,
    argumentNames: false,
    argumentDescriptions: false,
};

function getSearchText(entry: FunctionEntry, filters: LegacyFilterState) {
    const searchText: string[] = [];

    if (filters.functionNames) {
        searchText.push(entry.name, ...entry.aliases);
    }

    if (filters.functionDescriptions) {
        searchText.push(entry.description);
    }

    if (filters.functionReturnTypes) {
        searchText.push(entry.returnType);
    }

    if (filters.argumentNames) {
        searchText.push(...entry.arguments.map((argument) => argument.name));
    }

    if (filters.argumentDescriptions) {
        searchText.push(...entry.arguments.map((argument) => argument.description ?? ""));
    }

    return searchText.join(" ").toLowerCase();
}

export default function LegacyDocs() {
    const { data, error, isLoading } = useFunctionCatalog();

    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState<LegacyFilterState>(DEFAULT_FILTERS);

    const normalizedQuery = query.trim().toLowerCase();

    const functions = useMemo(() => {
        const catalog = [...(data?.functions ?? [])].sort((a, b) => a.id - b.id);

        if (!normalizedQuery) {
            return catalog;
        }

        return catalog.filter((entry) => getSearchText(entry, filters).includes(normalizedQuery));
    }, [data?.functions, filters, normalizedQuery]);

    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            <aside className="fixed inset-y-0 left-0 w-96 overflow-y-auto border-r border-zinc-700 bg-zinc-950 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-bold">Classic Wynntils Docs</h1>
                    <p className="text-sm text-zinc-400">Preserved old-style experience.</p>
                    <Link href="/" className="mt-2 inline-block text-sm text-sky-300 underline underline-offset-4">
                        Back to redesigned UI
                    </Link>
                </div>

                <div className="mb-4">
                    <p className="mb-2 font-bold">Search:</p>
                    <textarea
                        spellCheck={false}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="min-h-24 w-full resize-y rounded border border-zinc-700 bg-zinc-900 p-2 font-mono text-sm text-white outline-none focus:border-sky-500"
                        placeholder="Type your query..."
                    />
                </div>

                <div className="space-y-2 text-sm">
                    <p className="font-bold">Search includes:</p>

                    {(
                        [
                            ["functionNames", "Function names & aliases"],
                            ["functionDescriptions", "Function descriptions"],
                            ["functionReturnTypes", "Function return types"],
                            ["argumentNames", "Argument names"],
                            ["argumentDescriptions", "Argument descriptions"],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={filters[key]}
                                onChange={(event) =>
                                    setFilters((previous) => ({
                                        ...previous,
                                        [key]: event.target.checked,
                                    }))
                                }
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>

                <p className="mt-4 text-xs text-zinc-400">
                    Showing {functions.length} of {data?.count ?? 0} functions.
                </p>
            </aside>

            <main className="ml-96 p-4">
                {isLoading ? <p>Loading...</p> : null}
                {error ? <p className="text-red-300">Failed to load: {error}</p> : null}

                <div className="grid grid-cols-1 gap-4">
                    {functions.map((func) => {
                        const argumentSuffix =
                            func.arguments.length === 0
                                ? ""
                                : `(${func.arguments
                                      .map((argument) => (argument.required ? argument.name : `${argument.name}?`))
                                      .join("; ")})`;

                        return (
                            <Card key={func.id} className="bg-zinc-800">
                                <CardTitle>
                                    <code className="ml-2 text-lg">
                                        {func.name}
                                        {argumentSuffix}
                                    </code>
                                    <code className="float-right mr-2 text-lg">{func.returnType}</code>
                                </CardTitle>

                                <CardDescription>{func.description}</CardDescription>

                                <CardHeader>{func.arguments.length === 0 ? "No arguments" : "Arguments:"}</CardHeader>
                                <CardContent>
                                    {func.arguments.map((argument) => (
                                        <div key={argument.id}>
                                            - <code>{argument.name}</code> (<code>{argument.type}</code>,{" "}
                                            {argument.required
                                                ? "required"
                                                : `optional${argument.defaultValue ? `, default: ${argument.defaultValue}` : ""}`})
                                            {argument.description ? ` -- ${argument.description}` : ""}
                                        </div>
                                    ))}
                                </CardContent>

                                <CardHeader>{func.aliases.length === 0 ? "No aliases" : "Aliases:"}</CardHeader>
                                <CardContent>
                                    {func.aliases.map((alias) => (
                                        <div key={alias}>
                                            - <code>{alias}</code>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
