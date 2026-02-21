"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DEFAULT_SEARCH_SCOPE,
    SEARCH_SCOPE_OPTIONS,
    SearchScope,
    matchesQuery,
    normalizeQueryTokens,
} from "@/lib/search";
import { formatDateTime } from "@/lib/date-time";
import { FunctionArgument, FunctionEntry } from "@/lib/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { AlertTriangle, CheckCircle2, ListRestart, RefreshCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
    const argumentSuffix =
        entry.arguments.length === 0 ? "" : `(${entry.arguments.map((argument) => argument.name).join("; ")})`;

    return (
        <Card>
            <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="font-mono text-xl">
                        {entry.name}
                        {argumentSuffix}
                    </CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="secondary">{entry.arguments.length} args</Badge>
                        <Badge>{entry.returnType}</Badge>
                    </div>
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
    const { data, error, isLoading, isRefreshing, isUsingStaleData, refresh, cacheSavedAt } = useFunctionCatalog();

    const [query, setQuery] = useState("");
    const [searchScope, setSearchScope] = useState<SearchScope>(DEFAULT_SEARCH_SCOPE);
    const [refreshIndicator, setRefreshIndicator] = useState<"idle" | "success" | "error">("idle");
    const [lastRefreshSucceededAt, setLastRefreshSucceededAt] = useState<number | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const queryTokens = useMemo(() => normalizeQueryTokens(query), [query]);

    const sortedFunctions = useMemo(() => {
        return [...(data?.functions ?? [])].sort((first, second) => first.name.localeCompare(second.name));
    }, [data]);

    const filteredFunctions = useMemo(() => {
        return sortedFunctions.filter((entry) => matchesQuery(entry, searchScope, queryTokens));
    }, [queryTokens, searchScope, sortedFunctions]);

    const activeFilterCount = useMemo(() => {
        return Object.values(searchScope).filter(Boolean).length;
    }, [searchScope]);

    const isDefaultSearchScope = useMemo(() => {
        return SEARCH_SCOPE_OPTIONS.every(({ key }) => searchScope[key] === DEFAULT_SEARCH_SCOPE[key]);
    }, [searchScope]);

    const hasLoadedData = Boolean(data);

    async function handleRefresh() {
        setRefreshIndicator("idle");

        const didSucceed = await refresh();

        if (didSucceed) {
            setRefreshIndicator("success");
            setLastRefreshSucceededAt(Date.now());
            return;
        }

        setRefreshIndicator("error");
    }

    useEffect(() => {
        function onWindowKeyDown(event: KeyboardEvent) {
            if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName.toLowerCase();
            const isTypingTarget = target?.isContentEditable || tagName === "input" || tagName === "textarea";

            if (isTypingTarget) {
                return;
            }

            event.preventDefault();
            searchInputRef.current?.focus();
        }

        window.addEventListener("keydown", onWindowKeyDown);

        return () => {
            window.removeEventListener("keydown", onWindowKeyDown);
        };
    }, []);

    useEffect(() => {
        if (refreshIndicator === "idle") {
            return;
        }

        const timeout = window.setTimeout(() => {
            setRefreshIndicator("idle");
        }, 2500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [refreshIndicator]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-[90vw] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Wynntils Functions</h1>
                    {/*<p className="mt-1 text-sm text-muted-foreground">*/}
                    {/*</p>*/}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/old">Open classic UI</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/ide">Open IDE</Link>
                    </Button>
                    <Button onClick={() => void handleRefresh()} disabled={isRefreshing}>
                        {isRefreshing ? (
                            <RefreshCcw className="size-4 animate-spin" />
                        ) : refreshIndicator === "success" ? (
                            <CheckCircle2 className="size-4" />
                        ) : (
                            <RefreshCcw className="size-4" />
                        )}
                        {isRefreshing ? "Refreshing..." : refreshIndicator === "success" ? "Refreshed" : "Refresh data"}
                    </Button>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-[90vw] gap-6 px-4 pb-12 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="h-fit lg:sticky lg:top-4">
                    <CardHeader>
                        <CardTitle>Search</CardTitle>
                        <CardDescription>
                            Use multiple words to narrow results. Press / to focus search.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Find function, alias, type..."
                                className="pl-9 pr-9"
                            />

                            {query.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    aria-label="Clear search query"
                                >
                                    <X className="size-4" />
                                </button>
                            ) : null}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            {SEARCH_SCOPE_OPTIONS.map(({ key, label }) => {
                                const isLastActiveFilter = activeFilterCount === 1 && searchScope[key];

                                return (
                                    <div key={key} className="flex items-center gap-2">
                                        <Checkbox
                                            id={key}
                                            checked={searchScope[key]}
                                            disabled={isLastActiveFilter}
                                            onCheckedChange={(checked) =>
                                                setSearchScope((previous) => ({
                                                    ...previous,
                                                    [key]: checked === true,
                                                }))
                                            }
                                        />
                                        <Label htmlFor={key}>{label}</Label>
                                    </div>
                                );
                            })}
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => setSearchScope(DEFAULT_SEARCH_SCOPE)}
                            disabled={isDefaultSearchScope}
                            className="w-full"
                        >
                            <ListRestart className="size-4" />
                            Reset filters
                        </Button>

                        <Separator />

                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p>
                                Showing{" "}
                                <span className="font-semibold text-foreground">{filteredFunctions.length}</span> of{" "}
                                <span className="font-semibold text-foreground">{data?.count ?? 0}</span> functions.
                            </p>
                            <p>
                                Active search fields:{" "}
                                <span className="font-semibold text-foreground">{activeFilterCount}</span>
                            </p>
                            {cacheSavedAt ? <p>Cached locally: {formatDateTime(cacheSavedAt)}</p> : null}
                            {data?.generatedAt ? <p>Server payload: {formatDateTime(data.generatedAt)}</p> : null}
                            {lastRefreshSucceededAt ? (
                                <p>Last refresh: {formatDateTime(lastRefreshSucceededAt)}</p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <section className="space-y-4">
                    {hasLoadedData && error ? (
                        <Card className="border-amber-500/60 bg-amber-500/10">
                            <CardHeader>
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 size-4 text-amber-300" />
                                    <div>
                                        <CardTitle className="text-base">Catalog warning</CardTitle>
                                        <CardDescription className="text-amber-100/90">{error}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ) : null}

                    {hasLoadedData && isUsingStaleData ? (
                        <Card className="border-amber-500/60 bg-amber-500/10">
                            <CardHeader>
                                <CardTitle className="text-base">Using stale cached data</CardTitle>
                                <CardDescription className="text-amber-100/90">
                                    Refresh again after connectivity/database issues are resolved.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ) : null}

                    {!hasLoadedData && isLoading ? <LoadingState /> : null}

                    {!hasLoadedData && !isLoading && error ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Could not load function catalog</CardTitle>
                                <CardDescription>{error}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => void handleRefresh()} disabled={isRefreshing}>
                                    {isRefreshing ? (
                                        <RefreshCcw className="size-4 animate-spin" />
                                    ) : refreshIndicator === "success" ? (
                                        <CheckCircle2 className="size-4" />
                                    ) : (
                                        <RefreshCcw className="size-4" />
                                    )}
                                    {isRefreshing ? "Retrying..." : "Retry"}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null}

                    {hasLoadedData ? (
                        filteredFunctions.length === 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>No matches found</CardTitle>
                                    <CardDescription>
                                        Try broadening your search filters or clearing the query.
                                    </CardDescription>
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
