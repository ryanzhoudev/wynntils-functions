"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InlineColorPicker from "@/components/inline-color-picker";
import GuildStatsLink from "@/components/guild-stats-link";
import {
    analyzeGuildColor,
    createGuildColorPalette,
    type DirectionalColorSuggestion,
    evaluateGuildColor,
    findDirectionalColorSuggestions,
    GUILD_COLOR_DIRECTIONS,
    type GuildColorApiResponse,
    type GuildColorGroup,
    MIN_GUILD_COLOR_BRIGHTNESS,
    MIN_GUILD_COLOR_DELTA_E,
    normalizeGuildColorHex,
} from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    Copy,
    Database,
    Map as MapIcon,
    Palette,
    RotateCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";

const DEFAULT_COLOR = "#FFFFFF";
const DEFAULT_PREFIX = "TAG";
const NEARBY_ALLOWED_COUNT = 3;
const DIRECTION_BADGE_STYLES: Record<DirectionalColorSuggestion["channel"], string> = {
    r: "border-rose-400/35 bg-rose-500/20 text-rose-200",
    g: "border-emerald-400/35 bg-emerald-500/20 text-emerald-200",
    b: "border-sky-400/35 bg-sky-500/20 text-sky-200",
};

interface GuildColorToolProps {
    initialColor: string | null;
}

interface GuildPreviewSelection {
    forColor: string;
    kind: "guild";
    color: string;
    prefix: string;
    label: string;
}

interface SuggestionPreviewSelection {
    forColor: string;
    kind: "suggestion";
    color: string;
    label: string;
}

type PreviewSelection = GuildPreviewSelection | SuggestionPreviewSelection;

function TerritoryPreview({
    color,
    prefix,
    label,
    compact = false,
}: {
    color: string;
    prefix: string;
    label: string;
    compact?: boolean;
}) {
    const tag = prefix.trim().toUpperCase().slice(0, 8) || DEFAULT_PREFIX;

    return (
        <div
            role="img"
            aria-label={`${label}: territory bordered in ${color} with the tag ${tag}`}
            className="border-solid"
            style={{
                borderWidth: compact ? 10 : 16,
                borderImageSource: "url('/guild-color/border-frame.png')",
                borderImageSlice: 16,
                borderImageWidth: compact ? 10 : 16,
                borderImageRepeat: "stretch",
            }}
        >
            <div className="relative isolate aspect-[305/299] overflow-hidden bg-black">
                <Image
                    src="/guild-color/detlas.png"
                    alt=""
                    fill
                    sizes={compact ? "(max-width: 768px) 45vw, 20vw" : "(max-width: 1280px) 80vw, 24vw"}
                    className="object-cover"
                />
                <div
                    aria-hidden="true"
                    className={cn(
                        "absolute left-1/2 top-1/2 grid size-[82%] -translate-x-1/2 -translate-y-1/2 place-items-center border-solid",
                        compact ? "border-2" : "border-[3px]",
                    )}
                    style={{
                        borderColor: color,
                        backgroundColor: `${color}66`,
                    }}
                >
                    <span
                        className="text-2xl font-black sm:text-3xl"
                        style={{
                            color,
                            fontFamily: "WynnColorSavior, sans-serif",
                            textShadow:
                                "2px 2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, -2px -2px 0 #000, 2px 0 0 #000, 0 2px 0 #000, -2px 0 0 #000, 0 -2px 0 #000",
                        }}
                    >
                        {tag}
                    </span>
                </div>
            </div>
        </div>
    );
}

function guildGroupLabel(group: GuildColorGroup): string {
    if (group.guilds.length === 1) {
        const guild = group.guilds[0];
        return `${guild.name} [${guild.prefix.toUpperCase()}]`;
    }

    return `${group.guilds.length} guilds use this color`;
}

function guildGroupPrefix(group: GuildColorGroup): string {
    return group.guilds[0]?.prefix ?? DEFAULT_PREFIX;
}

function formatDistance(distance: number): string {
    return Number.isFinite(distance) ? distance.toFixed(2) : "—";
}

function parseApiError(payload: unknown): string {
    if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
        return payload.error;
    }

    return "Guild color data is temporarily unavailable.";
}

function subscribeToHashChange(callback: () => void): () => void {
    window.addEventListener("hashchange", callback);

    return () => window.removeEventListener("hashchange", callback);
}

function readHashColor(): string | null {
    try {
        return normalizeGuildColorHex(decodeURIComponent(window.location.hash.slice(1)));
    } catch {
        return null;
    }
}

function readServerHashColor(): null {
    return null;
}

export default function GuildColorTool({ initialColor }: GuildColorToolProps) {
    const hashColor = useSyncExternalStore(subscribeToHashChange, readHashColor, readServerHashColor);
    const [inputColorOverride, setInputColorOverride] = useState<string | null>(null);
    const inputColor = inputColorOverride ?? normalizeGuildColorHex(initialColor ?? "") ?? hashColor ?? DEFAULT_COLOR;
    const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
    const [guildData, setGuildData] = useState<GuildColorApiResponse | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [selection, setSelection] = useState<PreviewSelection | null>(null);
    const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
    const deferredInputColor = useDeferredValue(inputColor);
    const normalizedColor = normalizeGuildColorHex(inputColor);
    const deferredNormalizedColor = normalizeGuildColorHex(deferredInputColor);
    const palette = useMemo(() => createGuildColorPalette(guildData?.guilds ?? []), [guildData]);
    const liveVerdict = useMemo(
        () => (guildData && normalizedColor ? evaluateGuildColor(normalizedColor, palette) : null),
        [guildData, normalizedColor, palette],
    );
    const analysis = useMemo(
        () => (guildData && deferredNormalizedColor ? analyzeGuildColor(deferredNormalizedColor, palette) : null),
        [deferredNormalizedColor, guildData, palette],
    );
    const suggestions = useMemo(
        () =>
            analysis && deferredNormalizedColor
                ? findDirectionalColorSuggestions(deferredNormalizedColor, palette)
                : [],
        [analysis, deferredNormalizedColor, palette],
    );
    const suggestionsByDirection = useMemo(
        () => new Map(suggestions.map((suggestion) => [`${suggestion.channel}:${suggestion.direction}`, suggestion])),
        [suggestions],
    );
    const nearbyGroups = useMemo(() => {
        if (!analysis) {
            return [];
        }

        const conflicts = analysis.conflictingGroups;
        const conflictingColors = new Set(conflicts.map((group) => group.color));
        const closestAllowed = analysis.groups
            .filter((group) => !conflictingColors.has(group.color))
            .slice(0, NEARBY_ALLOWED_COUNT);

        return [...conflicts, ...closestAllowed];
    }, [analysis]);
    const closestGroup = analysis?.groups[0] ?? null;
    const isAnalyzing = normalizedColor !== deferredNormalizedColor;
    const hasSelectionForCurrentColor = selection?.forColor === deferredNormalizedColor;
    const activeSelection = hasSelectionForCurrentColor
        ? selection
        : closestGroup
          ? {
                forColor: deferredNormalizedColor ?? "",
                kind: "guild" as const,
                color: closestGroup.color,
                prefix: guildGroupPrefix(closestGroup),
                label: guildGroupLabel(closestGroup),
            }
          : null;

    useEffect(() => {
        const controller = new AbortController();

        async function loadGuildColors() {
            setLoadError(null);

            try {
                const response = await fetch("/api/guild-colors", {
                    headers: {
                        Accept: "application/json",
                    },
                    signal: controller.signal,
                });
                const payload: unknown = await response.json();

                if (!response.ok) {
                    throw new Error(parseApiError(payload));
                }

                setGuildData(payload as GuildColorApiResponse);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setGuildData(null);
                setLoadError(error instanceof Error ? error.message : "Guild color data is temporarily unavailable.");
            }
        }

        void loadGuildColors();

        return () => {
            controller.abort();
        };
    }, [loadAttempt]);

    function selectGuildGroup(group: GuildColorGroup) {
        if (!deferredNormalizedColor) {
            return;
        }

        setSelection({
            forColor: deferredNormalizedColor,
            kind: "guild",
            color: group.color,
            prefix: guildGroupPrefix(group),
            label: guildGroupLabel(group),
        });
    }

    function selectSuggestion(suggestion: DirectionalColorSuggestion) {
        if (!deferredNormalizedColor) {
            return;
        }

        setSelection({
            forColor: deferredNormalizedColor,
            kind: "suggestion",
            color: suggestion.color,
            label: `${suggestion.label} allowed suggestion`,
        });
    }

    async function copyShareUrl() {
        if (!normalizedColor) {
            return;
        }

        const shareUrl = new URL(window.location.href);
        shareUrl.search = "";
        shareUrl.hash = "";
        shareUrl.searchParams.set("hex", normalizedColor.slice(1));

        try {
            await navigator.clipboard.writeText(shareUrl.toString());
            setShareStatus("copied");
        } catch {
            setShareStatus("error");
        }

        window.setTimeout(() => setShareStatus("idle"), 1200);
    }

    const chosenPreviewColor = normalizedColor ?? "#000000";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <Palette className="size-7 text-primary" aria-hidden="true" />
                    <h1 className="text-3xl font-bold tracking-tight">Guild Color Picker</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link
                            href={
                                normalizedColor
                                    ? `/guild-color/map?hex=${normalizedColor.slice(1)}`
                                    : "/guild-color/map"
                            }
                        >
                            <MapIcon className="size-4" aria-hidden="true" />
                            Color map
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Back to functions
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-[100rem] gap-6 px-4 pb-12 xl:grid-cols-[20rem_minmax(0,1fr)]">
                <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle>Choose a color</CardTitle>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!normalizedColor}
                                onClick={copyShareUrl}
                            >
                                {shareStatus === "copied" ? (
                                    <Check className="size-4 text-emerald-300" aria-hidden="true" />
                                ) : (
                                    <Copy className="size-4" aria-hidden="true" />
                                )}
                                {shareStatus === "copied"
                                    ? "Copied"
                                    : shareStatus === "error"
                                      ? "Copy failed"
                                      : "Copy link"}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="guild-color">Guild color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="guild-color"
                                        value={inputColor}
                                        onChange={(event) => setInputColorOverride(event.target.value)}
                                        placeholder="#AABBCC"
                                        spellCheck={false}
                                        className="font-mono uppercase"
                                    />
                                </div>
                                {!normalizedColor ? (
                                    <p className="text-xs text-red-300">Use a three- or six-digit hexadecimal color.</p>
                                ) : null}
                            </div>

                            <InlineColorPicker
                                value={normalizedColor ?? chosenPreviewColor}
                                onChange={setInputColorOverride}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="guild-prefix">Preview tag</Label>
                                <Input
                                    id="guild-prefix"
                                    value={prefix}
                                    onChange={(event) => setPrefix(event.target.value.slice(0, 8))}
                                    placeholder={DEFAULT_PREFIX}
                                    maxLength={8}
                                />
                            </div>

                            <div
                                className={cn(
                                    "rounded-lg border p-4",
                                    liveVerdict?.allowed
                                        ? "border-emerald-400/40 bg-emerald-400/10"
                                        : "border-red-400/40 bg-red-400/10",
                                    !liveVerdict && "border-border bg-muted/40",
                                )}
                            >
                                {!normalizedColor ? (
                                    <>
                                        <p className="font-semibold">Invalid color</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Please provide a valid hex like #AABBCC or #ABC.
                                        </p>
                                    </>
                                ) : loadError ? (
                                    <>
                                        <div className="flex items-center gap-2 font-semibold">
                                            <AlertTriangle className="size-4 text-amber-300" aria-hidden="true" />
                                            Allowed? Not checked
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="mt-3"
                                            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                                        >
                                            Retry
                                        </Button>
                                    </>
                                ) : !liveVerdict ? (
                                    <p className="font-semibold">Checking color…</p>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 font-semibold">
                                            {liveVerdict.allowed ? (
                                                <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
                                            ) : (
                                                <AlertTriangle className="size-4 text-red-300" aria-hidden="true" />
                                            )}
                                            Allowed? {liveVerdict.allowed ? "🟩 Yes" : "🟥 No"}
                                        </div>
                                        <p className="mt-2 text-sm">
                                            <strong>Closest:</strong>{" "}
                                            {closestGroup
                                                ? `${guildGroupLabel(closestGroup)} (${closestGroup.color}, ΔE ${formatDistance(closestGroup.distance)})`
                                                : "Unknown"}
                                            {isAnalyzing ? (
                                                <Badge variant="outline" className="ml-2 align-middle text-[0.65rem]">
                                                    Updating nearby
                                                </Badge>
                                            ) : null}
                                        </p>
                                        {closestGroup ? (
                                            <ul className="mt-2 space-y-1.5 text-sm">
                                                {closestGroup.guilds.map((guild) => (
                                                    <li
                                                        key={`${guild.name}-${guild.prefix}`}
                                                        className="rounded-md bg-muted/40 p-2"
                                                    >
                                                        <GuildStatsLink guild={guild} seasons={guildData?.stats ?? null} />
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Brightness {liveVerdict.brightness.toFixed(1)} /{" "}
                                            {MIN_GUILD_COLOR_BRIGHTNESS} minimum
                                            {" · "}ΔE {formatDistance(liveVerdict.closestDistance)} /{" "}
                                            {MIN_GUILD_COLOR_DELTA_E} minimum
                                        </p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="size-4" aria-hidden="true" />
                                Guild color data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {guildData ? (
                                <>
                                    <Badge variant="secondary">
                                        {guildData.guilds.length.toLocaleString()} guild colors
                                    </Badge>
                                    <p className="text-muted-foreground">
                                        Athena response timestamp: {new Date(guildData.fetchedAt).toLocaleString()}.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Excluded {guildData.excludedPlaceholderCount} placeholder entries using #C05F5F.
                                    </p>
                                </>
                            ) : loadError ? (
                                <p className="text-amber-200">
                                    Unavailable. The tool will not issue a verdict without guild data.
                                </p>
                            ) : (
                                <p className="text-muted-foreground">Loading from the same-origin proxy…</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <section aria-labelledby="preview-heading">
                        <h2 id="preview-heading" className="sr-only">
                            Territory previews
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_17rem]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Chosen color</CardTitle>
                                    <code className="text-sm text-muted-foreground">
                                        {normalizedColor ?? "Invalid color"}
                                    </code>
                                </CardHeader>
                                <CardContent>
                                    <TerritoryPreview
                                        color={chosenPreviewColor}
                                        prefix={prefix}
                                        label={`Entered color ${normalizedColor ?? inputColor}`}
                                    />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Comparison preview</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {activeSelection
                                            ? `${activeSelection.label} · ${activeSelection.color}`
                                            : "Waiting for guild color data"}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    {activeSelection ? (
                                        <TerritoryPreview
                                            color={activeSelection.color}
                                            prefix={
                                                activeSelection.kind === "suggestion" ? prefix : activeSelection.prefix
                                            }
                                            label={activeSelection.label}
                                        />
                                    ) : (
                                        <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                                            No comparison available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col md:col-span-2 xl:col-span-1">
                                <CardHeader>
                                    <CardTitle>Closest allowed</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {analysis ? (
                                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                            {GUILD_COLOR_DIRECTIONS.map((direction) => {
                                                const suggestion = suggestionsByDirection.get(
                                                    `${direction.channel}:${direction.direction}`,
                                                );
                                                const isSelected =
                                                    suggestion &&
                                                    activeSelection?.kind === "suggestion" &&
                                                    activeSelection.color === suggestion.color &&
                                                    activeSelection.label.startsWith(suggestion.label);

                                                return (
                                                    <button
                                                        type="button"
                                                        key={`${direction.channel}-${direction.direction}`}
                                                        onClick={() => suggestion && selectSuggestion(suggestion)}
                                                        disabled={!suggestion}
                                                        aria-pressed={isSelected}
                                                        className={cn(
                                                            "flex items-center gap-2 rounded-lg border bg-background p-2 text-left transition hover:border-primary/70 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background",
                                                            isSelected && "border-primary ring-1 ring-primary/40",
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={cn(
                                                                "size-9 shrink-0 rounded-md border border-white/20 shadow-inner",
                                                                !suggestion && "bg-muted",
                                                            )}
                                                            style={
                                                                suggestion
                                                                    ? { backgroundColor: suggestion.color }
                                                                    : undefined
                                                            }
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        DIRECTION_BADGE_STYLES[direction.channel]
                                                                    }
                                                                >
                                                                    {direction.label}
                                                                </Badge>
                                                                {suggestion ? (
                                                                    <code className="truncate text-xs">
                                                                        {suggestion.color}
                                                                    </code>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Unavailable
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {suggestion ? (
                                                                <span className="mt-1 block text-xs text-muted-foreground">
                                                                    {suggestion.steps} step
                                                                    {suggestion.steps === 1 ? "" : "s"} · ΔE{" "}
                                                                    {formatDistance(suggestion.closestDistance)}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Waiting for guild data…</p>
                                    )}
                                </CardContent>
                                <CardFooter className="mt-auto">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className={cn("w-full", !hasSelectionForCurrentColor && "invisible")}
                                        disabled={!hasSelectionForCurrentColor}
                                        aria-hidden={!hasSelectionForCurrentColor}
                                        tabIndex={hasSelectionForCurrentColor ? 0 : -1}
                                        onClick={() => setSelection(null)}
                                    >
                                        <RotateCcw className="size-4" aria-hidden="true" />
                                        Return to closest
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </section>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle>Closest guild colors</CardTitle>
                                {analysis ? (
                                    <Badge
                                        variant="outline"
                                        className={
                                            analysis.conflictingGroups.length > 0
                                                ? "border-red-400/50 text-red-200"
                                                : "border-emerald-400/50 text-emerald-200"
                                        }
                                    >
                                        {analysis.conflictingGroups.length} too-close color
                                        {analysis.conflictingGroups.length === 1 ? "" : "s"}
                                    </Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {nearbyGroups.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                    {nearbyGroups.map((group) => {
                                        const isConflict = group.distance < MIN_GUILD_COLOR_DELTA_E;
                                        const isSelected =
                                            activeSelection?.kind === "guild" && activeSelection.color === group.color;

                                        return (
                                            <div
                                                key={group.color}
                                                className={cn(
                                                    "overflow-hidden rounded-lg border bg-background transition",
                                                    isSelected && "border-primary ring-1 ring-primary/40",
                                                    isConflict && "border-red-400/40",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => selectGuildGroup(group)}
                                                    aria-pressed={isSelected}
                                                    className="block w-full p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                                >
                                                    <TerritoryPreview
                                                        compact
                                                        color={group.color}
                                                        prefix={guildGroupPrefix(group)}
                                                        label={guildGroupLabel(group)}
                                                    />
                                                    <div className="mt-3 flex items-center justify-between gap-2">
                                                        <code className="text-sm font-semibold">{group.color}</code>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                isConflict ? "border-red-400/40 text-red-200" : ""
                                                            }
                                                        >
                                                            ΔE {formatDistance(group.distance)}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-2 text-sm font-medium">{guildGroupLabel(group)}</p>
                                                </button>
                                                <ul className="space-y-1.5 border-t p-2 text-xs">
                                                    {group.guilds.map((guild) => (
                                                        <li
                                                            key={`${guild.name}-${guild.prefix}`}
                                                            className="rounded-md bg-muted/40 p-2"
                                                        >
                                                            <GuildStatsLink
                                                                guild={guild}
                                                                seasons={guildData?.stats ?? null}
                                                            />
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {loadError ? "Guild comparisons are unavailable." : "Loading closest guild colors…"}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
