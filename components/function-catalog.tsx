"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SEARCH_SCOPE_OPTIONS } from "@/lib/search";
import { useCatalogSearch } from "@/lib/use-catalog-search";
import { formatDateTime } from "@/lib/date-time";
import { hasSemanticArgumentValidation } from "@/lib/ide/browser-lsp/semantic-validation";
import { FunctionArgument, FunctionEntry } from "@/lib/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ListRestart, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

const sortFunctionsByName = (first: FunctionEntry, second: FunctionEntry) => first.name.localeCompare(second.name);

function FunctionArgumentCard({
    argument,
    hasIdeValidation,
}: {
    argument: FunctionArgument;
    hasIdeValidation: boolean;
}) {
    return (
        <div className="rounded-md border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{argument.name}</code>
                <div className="ml-auto flex items-center gap-2">
                    {hasIdeValidation ? <Badge variant="outline">IDE validation</Badge> : null}
                    <Badge variant="secondary">{argument.type}</Badge>
                    <Badge variant={argument.required ? "default" : "outline"}>
                        {argument.required ? "required" : "optional"}
                    </Badge>
                </div>
            </div>

            {argument.defaultValue && argument.defaultValue !== "null" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    Default: <code>{argument.defaultValue}</code>
                </p>
            ) : null}
            {argument.description ? <p className="mt-2 text-sm text-muted-foreground">{argument.description}</p> : null}
        </div>
    );
}

type ExactFunctionMatch = "name" | "alias";

function getExactFunctionMatch(entry: FunctionEntry, query: string): ExactFunctionMatch | null {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
        return null;
    }

    if (entry.name.toLowerCase() === normalizedQuery) {
        return "name";
    }

    return entry.aliases.some((alias) => alias.toLowerCase() === normalizedQuery) ? "alias" : null;
}

function FunctionCard({ entry, exactMatch }: { entry: FunctionEntry; exactMatch?: ExactFunctionMatch | null }) {
    const argumentSuffix =
        entry.arguments.length === 0 ? "" : `(${entry.arguments.map((argument) => argument.name).join("; ")})`;

    return (
        <Card
            className={cn(
                "catalog-card",
                exactMatch &&
                    "border-emerald-400/55 bg-[linear-gradient(180deg,rgba(52,211,153,0.10),rgba(52,211,153,0.04))]",
            )}
        >
            <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-mono text-xl">
                        {entry.name}
                        {argumentSuffix}
                    </CardTitle>
                    <div className="flex gap-2">
                        {exactMatch ? (
                            <Badge variant="outline" className="border-emerald-400/60 text-emerald-200">
                                exact {exactMatch}
                            </Badge>
                        ) : null}
                        <Badge variant="secondary">{entry.returnType}</Badge>
                    </div>
                </div>
                <CardDescription className="text-sm leading-relaxed">{entry.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <p className="mb-2 text-sm font-semibold">{"Arguments (" + entry.arguments.length + ")"}</p>
                    {entry.arguments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No arguments.</p>
                    ) : (
                        <div className="space-y-2">
                            {entry.arguments.map((argument, argumentIndex) => (
                                <FunctionArgumentCard
                                    key={argument.id}
                                    argument={argument}
                                    hasIdeValidation={hasSemanticArgumentValidation(entry.name, argumentIndex)}
                                />
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

function WarningCard({ title, description }: { title: string; description: ReactNode }) {
    return (
        <Card className="border-amber-500/60 bg-amber-500/10">
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription className="text-amber-100/90">{description}</CardDescription>
                    </div>
                    <AlertTriangle className="size-4 shrink-0 self-center text-amber-300" />
                </div>
            </CardHeader>
        </Card>
    );
}

function RefreshButtonContent({
    isRefreshing,
    isRateLimited,
    didSucceed,
    idleLabel,
}: {
    isRefreshing: boolean;
    isRateLimited: boolean;
    didSucceed: boolean;
    idleLabel: "Refresh data" | "Retry";
}) {
    const label = isRefreshing
        ? idleLabel === "Retry"
            ? "Retrying..."
            : "Refreshing..."
        : isRateLimited
          ? "Rate limited"
          : didSucceed
            ? "Refreshed"
            : idleLabel;

    return (
        <>
            {isRefreshing ? (
                <RefreshCw className="size-4 animate-spin" />
            ) : isRateLimited ? (
                <AlertTriangle className="size-4" />
            ) : didSucceed ? (
                <CheckCircle2 className="size-4" />
            ) : (
                <RefreshCw className="size-4" />
            )}
            {label}
        </>
    );
}

export default function FunctionCatalog() {
    const { data, error, isLoading, isRefreshing, isUsingStaleData, refreshRateLimit, refresh, cacheSavedAt } =
        useFunctionCatalog();

    const {
        query,
        setQuery,
        searchScope,
        setSearchScope,
        filteredFunctions: searchMatches,
        activeFilterCount,
        isDefaultSearchScope,
        resetSearch,
    } = useCatalogSearch(data?.functions, { sortEntries: sortFunctionsByName });
    const [refreshIndicator, setRefreshIndicator] = useState<"idle" | "success" | "error">("idle");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const exactMatchByFunctionId = useMemo(() => {
        return new Map((data?.functions ?? []).map((entry) => [entry.id, getExactFunctionMatch(entry, query)]));
    }, [data?.functions, query]);

    const filteredFunctions = useMemo(() => {
        return [...searchMatches].sort((first, second) => {
            const firstExactMatch = exactMatchByFunctionId.get(first.id);
            const secondExactMatch = exactMatchByFunctionId.get(second.id);

            if (firstExactMatch && !secondExactMatch) {
                return -1;
            }

            if (!firstExactMatch && secondExactMatch) {
                return 1;
            }

            if (firstExactMatch === "name" && secondExactMatch === "alias") {
                return -1;
            }

            if (firstExactMatch === "alias" && secondExactMatch === "name") {
                return 1;
            }

            return 0;
        });
    }, [exactMatchByFunctionId, searchMatches]);

    const hasLoadedData = Boolean(data);
    const isRefreshRateLimited = refreshRateLimit.isLimited;
    const isRefreshDisabled = isRefreshing || isRefreshRateLimited;

    async function handleRefresh() {
        setRefreshIndicator("idle");

        const didSucceed = await refresh();

        if (didSucceed) {
            setRefreshIndicator("success");
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
            <header className="mx-auto flex w-full max-w-[86rem] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Wynntils Functions</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/old">Open classic UI</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/ide">Open IDE</Link>
                    </Button>
                    <Button onClick={() => void handleRefresh()} disabled={isRefreshDisabled}>
                        <RefreshButtonContent
                            isRefreshing={isRefreshing}
                            isRateLimited={isRefreshRateLimited}
                            didSucceed={refreshIndicator === "success"}
                            idleLabel="Refresh data"
                        />
                    </Button>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-[86rem] gap-6 px-4 pb-12 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Card className="h-fit lg:sticky lg:top-4">
                    <CardHeader>
                        <CardTitle>Search</CardTitle>
                        <CardDescription>Press / to focus search from anywhere</CardDescription>
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
                            onClick={resetSearch}
                            disabled={isDefaultSearchScope && query === ""}
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
                        </div>

                        <Separator />

                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Source mod version: {data?.dataVersion ?? "Unknown"}</p>
                            <p>
                                Data generated:{" "}
                                {data?.harvestedAt != null ? `${formatDateTime(data.harvestedAt)}` : "Unknown"}
                            </p>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                            {cacheSavedAt ? (
                                <p
                                    className={
                                        data?.harvestedAt != null && data.harvestedAt > cacheSavedAt
                                            ? "text-red-500"
                                            : ""
                                    }
                                >
                                    Cached locally: {formatDateTime(cacheSavedAt)}
                                </p>
                            ) : null}
                            <p>
                                Refresh budget:{" "}
                                <span className="font-semibold text-foreground">{refreshRateLimit.remaining}</span>/5 in
                                15m
                            </p>
                            {refreshRateLimit.nextAllowedAt ? (
                                <p>Next refresh allowed: {formatDateTime(refreshRateLimit.nextAllowedAt)}</p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <section className="space-y-4">
                    {hasLoadedData && error ? <WarningCard title="Catalog warning" description={error} /> : null}

                    {hasLoadedData && isUsingStaleData ? (
                        <WarningCard
                            title="Using stale cached data"
                            description="Refresh again after connectivity/database issues are resolved."
                        />
                    ) : null}

                    {refreshRateLimit.isLimited ? (
                        <WarningCard
                            title="Refresh rate limit reached"
                            description={
                                <>
                                    You can refresh up to 5 times every 15 minutes. Next refresh window starts at{" "}
                                    {refreshRateLimit.nextAllowedAt
                                        ? formatDateTime(refreshRateLimit.nextAllowedAt)
                                        : "a later time"}
                                    .
                                </>
                            }
                        />
                    ) : null}

                    {!hasLoadedData && isLoading ? <LoadingState /> : null}

                    {!hasLoadedData && !isLoading && error ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Could not load function catalog</CardTitle>
                                <CardDescription>{error}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => void handleRefresh()} disabled={isRefreshDisabled}>
                                    <RefreshButtonContent
                                        isRefreshing={isRefreshing}
                                        isRateLimited={isRefreshRateLimited}
                                        didSucceed={refreshIndicator === "success"}
                                        idleLabel="Retry"
                                    />
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
                                    <FunctionCard
                                        key={entry.id}
                                        entry={entry}
                                        exactMatch={exactMatchByFunctionId.get(entry.id)}
                                    />
                                ))}
                            </div>
                        )
                    ) : null}
                </section>
            </main>
        </div>
    );
}
