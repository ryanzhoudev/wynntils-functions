"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FunctionArgument, FunctionEntry } from "@/lib/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { ListRestart, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type SearchScope = {
    functionNames: boolean;
    functionDescriptions: boolean;
    functionReturnTypes: boolean;
    argumentNames: boolean;
    argumentDescriptions: boolean;
};

const DEFAULT_SEARCH_SCOPE: SearchScope = {
    functionNames: true,
    functionDescriptions: true,
    functionReturnTypes: false,
    argumentNames: false,
    argumentDescriptions: false,
};

function createSearchBlob(entry: FunctionEntry, scope: SearchScope) {
    const parts: string[] = [];

    if (scope.functionNames) {
        parts.push(entry.name, ...entry.aliases);
    }

    if (scope.functionDescriptions) {
        parts.push(entry.description);
    }

    if (scope.functionReturnTypes) {
        parts.push(entry.returnType);
    }

    if (scope.argumentNames) {
        parts.push(...entry.arguments.map((argument) => argument.name));
    }

    if (scope.argumentDescriptions) {
        parts.push(...entry.arguments.map((argument) => argument.description ?? ""));
    }

    return parts.join(" ").toLowerCase();
}

function FunctionArgumentCard({ argument }: { argument: FunctionArgument }) {
    return (
        <div className="rounded-md border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{argument.name}</code>
                <Badge variant="secondary">{argument.type}</Badge>
                <Badge variant={argument.required ? "default" : "outline"}>
                    {argument.required ? "required" : "optional"}
                </Badge>
            </div>

            {argument.defaultValue ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    Default: <code>{argument.defaultValue}</code>
                </p>
            ) : null}

            {argument.description ? <p className="mt-2 text-sm text-muted-foreground">{argument.description}</p> : null}
        </div>
    );
}

function FunctionCard({ entry }: { entry: FunctionEntry }) {
    return (
        <Card>
            <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="font-mono text-xl">{entry.name}</CardTitle>
                    <Badge>{entry.returnType}</Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">{entry.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <p className="mb-2 text-sm font-semibold">Arguments</p>
                    {entry.arguments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No arguments.</p>
                    ) : (
                        <div className="space-y-2">
                            {entry.arguments.map((argument) => (
                                <FunctionArgumentCard key={argument.id} argument={argument} />
                            ))}
                        </div>
                    )}
                </div>

                <Separator />

                <div>
                    <p className="mb-2 text-sm font-semibold">Aliases</p>
                    {entry.aliases.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No aliases.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {entry.aliases.map((alias) => (
                                <Badge key={alias} variant="outline" className="font-mono">
                                    {alias}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function FunctionCatalog() {
    const { data, error, isLoading, isRefreshing, refresh, cacheSavedAt } = useFunctionCatalog();

    const [query, setQuery] = useState("");
    const [searchScope, setSearchScope] = useState<SearchScope>(DEFAULT_SEARCH_SCOPE);

    const normalizedQuery = query.trim().toLowerCase();

    const sortedFunctions = useMemo(() => {
        return [...(data?.functions ?? [])].sort((first, second) => first.name.localeCompare(second.name));
    }, [data]);

    const filteredFunctions = useMemo(() => {
        if (!normalizedQuery) {
            return sortedFunctions;
        }

        return sortedFunctions.filter((entry) => createSearchBlob(entry, searchScope).includes(normalizedQuery));
    }, [normalizedQuery, searchScope, sortedFunctions]);

    const hasLoadedData = Boolean(data);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Wynntils Functions</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Dynamic docs powered by Prisma + Next.js API. Cached locally for a snappy experience.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/old">Open classic UI</Link>
                    </Button>
                    <Button variant="secondary" onClick={() => setSearchScope(DEFAULT_SEARCH_SCOPE)}>
                        <ListRestart className="size-4" />
                        Reset filters
                    </Button>
                    <Button onClick={() => refresh()} disabled={isRefreshing}>
                        <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh data
                    </Button>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-12 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="h-fit lg:sticky lg:top-4">
                    <CardHeader>
                        <CardTitle>Search</CardTitle>
                        <CardDescription>Choose which fields to search, then type to filter functions.</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Find function, alias, type..."
                                className="pl-9"
                            />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            {(
                                [
                                    ["functionNames", "Function names & aliases"],
                                    ["functionDescriptions", "Function descriptions"],
                                    ["functionReturnTypes", "Return types"],
                                    ["argumentNames", "Argument names"],
                                    ["argumentDescriptions", "Argument descriptions"],
                                ] as const
                            ).map(([key, label]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Checkbox
                                        id={key}
                                        checked={searchScope[key]}
                                        onCheckedChange={(checked) =>
                                            setSearchScope((previous) => ({
                                                ...previous,
                                                [key]: checked === true,
                                            }))
                                        }
                                    />
                                    <Label htmlFor={key}>{label}</Label>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p>
                                Showing <span className="font-semibold text-foreground">{filteredFunctions.length}</span> of{" "}
                                <span className="font-semibold text-foreground">{data?.count ?? 0}</span> functions.
                            </p>
                            {cacheSavedAt ? <p>Cached locally: {new Date(cacheSavedAt).toLocaleString()}</p> : null}
                            {data?.generatedAt ? <p>Server payload: {new Date(data.generatedAt).toLocaleString()}</p> : null}
                        </div>
                    </CardContent>
                </Card>

                <section className="space-y-4">
                    {!hasLoadedData && isLoading ? <LoadingState /> : null}

                    {!hasLoadedData && !isLoading && error ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Could not load function catalog</CardTitle>
                                <CardDescription>{error}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => refresh()}>Retry</Button>
                            </CardContent>
                        </Card>
                    ) : null}

                    {hasLoadedData ? (
                        filteredFunctions.length === 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>No matches found</CardTitle>
                                    <CardDescription>Try broadening your search filters or clearing the query.</CardDescription>
                                </CardHeader>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {filteredFunctions.map((entry) => (
                                    <FunctionCard key={entry.id} entry={entry} />
                                ))}
                            </div>
                        )
                    ) : null}
                </section>
            </main>
        </div>
    );
}
