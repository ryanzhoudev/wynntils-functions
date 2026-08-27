"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GuildStatsLink from "@/components/guild-stats-link";
import { loadGuildColorData } from "@/lib/guild-color-client";
import {
    classifyGuildColorMapPoint,
    createGuildColorMapGroups,
    GUILD_COLOR_MAP_DEFAULT_LIGHTNESS,
    GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH,
    GUILD_COLOR_MAP_FLAG_IN_GAMUT,
    GUILD_COLOR_MAP_PREVIEW_RESOLUTION,
    GUILD_COLOR_MAP_RESOLUTION,
    guildColorMapFullResolution,
    type GuildColorMapGroup,
    type GuildColorMapRenderResponse,
    type GuildColorMapWorkerGroup,
    type GuildColorMapWorkerResponse,
    labToMapPosition,
    readGuildColorMapPoint,
} from "@/lib/guild-color-map";
import {
    createGuildColorPalette,
    deltaE76,
    filterGuildColorsByActivity,
    GUILD_ACTIVITY_RATING_THRESHOLD,
    type GuildColorApiResponse,
    hexToRgb,
    MIN_GUILD_COLOR_DELTA_E,
    normalizeGuildColorHex,
    rgbToLab,
    rgbToHex,
} from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import { ArrowLeft, Database, Filter, Map as MapIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
    type FormEvent,
    type PointerEvent as ReactPointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

interface MapSample {
    ownerIndex: number;
    flags: number;
    point: ReturnType<typeof readGuildColorMapPoint>;
}

interface GuildColorMapProps {
    initialColor?: string | null;
    initialIgnoreLowActivity: boolean;
}

type GuildColorStatsStatus = "loading" | "ready" | "unavailable";

function roundLightness(lightness: number): number {
    return Math.round(lightness * 10) / 10;
}

function replaceTargetQuery(color: string | null) {
    const url = new URL(window.location.href);
    url.searchParams.delete("color");

    if (color) {
        url.searchParams.set("hex", color.slice(1));
    } else {
        url.searchParams.delete("hex");
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, "", nextUrl);
    }
}

function guildColorRouteHref(path: string, color: string | null, ignoreLowActivity: boolean): string {
    const searchParams = new URLSearchParams();

    if (color) {
        searchParams.set("hex", color.slice(1));
    }

    if (ignoreLowActivity) {
        searchParams.set("ignoreLowActivity", "1");
    }

    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
}

function workerGroupsEqual(
    first: ReadonlyArray<GuildColorMapWorkerGroup>,
    second: ReadonlyArray<GuildColorMapWorkerGroup>,
): boolean {
    return (
        first.length === second.length &&
        first.every(
            (group, index) =>
                group.color === second[index].color &&
                group.lab.L === second[index].lab.L &&
                group.lab.a === second[index].lab.a &&
                group.lab.b === second[index].lab.b,
        )
    );
}

function guildGroupLabel(group: GuildColorMapGroup): string {
    if (group.guilds.length === 1) {
        const guild = group.guilds[0];
        return `${guild.name} [${guild.prefix.toUpperCase()}]`;
    }

    return `${group.guilds.length} guilds share ${group.color}`;
}

function LegendItem({ className, label }: { className: string; label: string }) {
    return (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className={cn("size-3 rounded-sm border", className)} />
            {label}
        </span>
    );
}

export default function GuildColorMap({ initialColor, initialIgnoreLowActivity }: GuildColorMapProps) {
    const normalizedInitialColor = normalizeGuildColorHex(initialColor ?? "");
    const initialRgb = normalizedInitialColor ? hexToRgb(normalizedInitialColor) : null;
    const initialLightness = initialRgb ? roundLightness(rgbToLab(initialRgb).L) : GUILD_COLOR_MAP_DEFAULT_LIGHTNESS;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const workerGroupsRef = useRef<GuildColorMapWorkerGroup[]>([]);
    const activeMapPointerId = useRef<number | null>(null);
    const latestRequestId = useRef(0);
    const latestRenderedRequestId = useRef(0);
    const [lightness, setLightness] = useState(initialLightness);
    const [isAdjustingLightness, setIsAdjustingLightness] = useState(false);
    const [fullRenderResolution, setFullRenderResolution] = useState(GUILD_COLOR_MAP_RESOLUTION);
    const [guildData, setGuildData] = useState<GuildColorApiResponse | null>(null);
    const [workerGroups, setWorkerGroups] = useState<GuildColorMapWorkerGroup[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [ignoreLowActivity, setIgnoreLowActivity] = useState(initialIgnoreLowActivity);
    const [statsStatus, setStatsStatus] = useState<GuildColorStatsStatus>("loading");
    const [statsError, setStatsError] = useState<string | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [renderedMap, setRenderedMap] = useState<GuildColorMapRenderResponse | null>(null);
    const [sample, setSample] = useState<MapSample | null>(null);
    const [jumpInput, setJumpInput] = useState(normalizedInitialColor ?? initialColor ?? "");
    const [targetColor, setTargetColor] = useState<string | null>(normalizedInitialColor);
    const [jumpError, setJumpError] = useState<string | null>(
        initialColor && !normalizedInitialColor ? "Use a three- or six-digit hexadecimal color." : null,
    );
    const activityFilterPending = ignoreLowActivity && statsStatus === "loading";
    const activityFilterUnavailable = ignoreLowActivity && statsStatus === "unavailable";
    const effectiveGuilds = useMemo(() => {
        if (!guildData || activityFilterPending) {
            return [];
        }

        return filterGuildColorsByActivity(
            guildData.guilds,
            ignoreLowActivity && statsStatus === "ready",
        );
    }, [activityFilterPending, guildData, ignoreLowActivity, statsStatus]);
    const ignoredGuildCount =
        guildData && ignoreLowActivity && statsStatus === "ready"
            ? guildData.guilds.length - effectiveGuilds.length
            : 0;
    const groups = useMemo(
        () => createGuildColorMapGroups(createGuildColorPalette(effectiveGuilds)),
        [effectiveGuilds],
    );
    const nextWorkerGroups = useMemo(
        () => groups.map(({ color, lab }) => ({ color, lab })),
        [groups],
    );
    const canRenderMap = Boolean(guildData && !activityFilterPending);
    const target = useMemo(() => {
        const rgb = targetColor ? hexToRgb(targetColor) : null;

        return rgb ? { rgb, lab: rgbToLab(rgb) } : null;
    }, [targetColor]);
    const targetSample = useMemo(() => {
        if (!renderedMap || !target || Math.abs(renderedMap.lightness - lightness) > 0.001) {
            return null;
        }

        const point = { ...target, inGamut: true };
        const classification = classifyGuildColorMapPoint(point, workerGroups);

        return {
            ownerIndex: classification.claimed ? classification.closestGroupIndex : -1,
            flags:
                GUILD_COLOR_MAP_FLAG_IN_GAMUT | (classification.brightEnough ? GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH : 0),
            point,
        } satisfies MapSample;
    }, [lightness, renderedMap, target, workerGroups]);
    const activeSample = sample ?? targetSample;
    const sampleGroup =
        activeSample?.ownerIndex !== undefined && activeSample.ownerIndex >= 0 ? groups[activeSample.ownerIndex] : null;
    const sampleInGamut = Boolean(activeSample && (activeSample.flags & GUILD_COLOR_MAP_FLAG_IN_GAMUT) !== 0);
    const sampleBrightEnough = Boolean(activeSample && (activeSample.flags & GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH) !== 0);
    const sampleAllowed = sampleInGamut && sampleBrightEnough && !sampleGroup;
    const sampleDistance = activeSample && sampleGroup ? deltaE76(activeSample.point.lab, sampleGroup.lab) : null;
    const targetMarkerPosition = target ? labToMapPosition(target.lab, 101, 101) : null;
    const allowedPercentage =
        renderedMap && renderedMap.statistics.inGamut > 0
            ? (renderedMap.statistics.allowed / renderedMap.statistics.inGamut) * 100
            : null;

    useEffect(() => {
        const mapContainer = mapContainerRef.current;

        if (!mapContainer) {
            return;
        }

        const updateResolution = (displayWidth: number) => {
            const resolution = guildColorMapFullResolution(displayWidth, window.devicePixelRatio);
            setFullRenderResolution((currentResolution) =>
                currentResolution === resolution ? currentResolution : resolution,
            );
        };
        const observer = new ResizeObserver(([entry]) => {
            updateResolution(entry?.contentRect.width ?? mapContainer.clientWidth);
        });
        const handleWindowResize = () => updateResolution(mapContainer.clientWidth);
        observer.observe(mapContainer);
        window.addEventListener("resize", handleWindowResize);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", handleWindowResize);
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function loadGuildColors() {
            setLoadError(null);
            setStatsStatus("loading");
            setStatsError(null);

            try {
                await loadGuildColorData(
                    controller.signal,
                    (data, phase) => {
                        setGuildData(data);

                        if (phase === "stats") {
                            setStatsStatus("ready");
                        }
                    },
                    (message) => {
                        setStatsStatus("unavailable");
                        setStatsError(message);
                    },
                );
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setGuildData(null);
                setLoadError(error instanceof Error ? error.message : "Guild color data is temporarily unavailable.");
            }
        }

        void loadGuildColors();

        return () => controller.abort();
    }, [loadAttempt]);

    useEffect(() => {
        if (workerGroupsEqual(workerGroupsRef.current, nextWorkerGroups)) {
            return;
        }

        workerGroupsRef.current = nextWorkerGroups;
        latestRequestId.current += 1;
        setWorkerGroups(nextWorkerGroups);
        setRenderedMap(null);
        setSample(null);
    }, [nextWorkerGroups]);

    useEffect(() => {
        const worker = new Worker(new URL("../lib/guild-color-map/worker.ts", import.meta.url), {
            type: "module",
        });
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<GuildColorMapWorkerResponse>) => {
            const response = event.data;

            if (
                response.requestId !== latestRequestId.current ||
                response.requestId < latestRenderedRequestId.current
            ) {
                return;
            }

            if (response.type === "error") {
                if (response.requestId === latestRequestId.current) {
                    setRenderError(response.message);
                }
                return;
            }

            latestRenderedRequestId.current = response.requestId;
            setRenderError(null);
            setRenderedMap(response);
            setSample(null);
        };

        worker.onerror = (event) => {
            setRenderError(event.message || "The color map worker failed.");
        };

        return () => {
            workerRef.current = null;
            worker.terminate();
        };
    }, []);

    useEffect(() => {
        if (!workerRef.current || !canRenderMap || !workerGroupsEqual(workerGroups, workerGroupsRef.current)) {
            return;
        }

        const requestId = latestRequestId.current + 1;
        const resolution = isAdjustingLightness ? GUILD_COLOR_MAP_PREVIEW_RESOLUTION : fullRenderResolution;
        latestRequestId.current = requestId;
        workerRef.current.postMessage({
            type: "render",
            requestId,
            lightness,
            width: resolution,
            height: resolution,
            groups: workerGroups,
        });
    }, [canRenderMap, fullRenderResolution, isAdjustingLightness, lightness, workerGroups]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !renderedMap) {
            return;
        }

        canvas.width = renderedMap.width;
        canvas.height = renderedMap.height;
        const context = canvas.getContext("2d");

        if (!context) {
            setRenderError("This browser could not create the color map canvas.");
            return;
        }

        const pixels = new Uint8ClampedArray(renderedMap.pixels.length);
        pixels.set(renderedMap.pixels);
        context.putImageData(new ImageData(pixels, renderedMap.width, renderedMap.height), 0, 0);
    }, [renderedMap]);

    function inspectMap(clientX: number, clientY: number): MapSample | null {
        const canvas = canvasRef.current;

        if (!canvas || !renderedMap) {
            return null;
        }

        const bounds = canvas.getBoundingClientRect();
        const x = Math.min(
            renderedMap.width - 1,
            Math.max(0, Math.floor(((clientX - bounds.left) / bounds.width) * renderedMap.width)),
        );
        const y = Math.min(
            renderedMap.height - 1,
            Math.max(0, Math.floor(((clientY - bounds.top) / bounds.height) * renderedMap.height)),
        );
        const index = y * renderedMap.width + x;

        const nextSample = {
            ownerIndex: renderedMap.owners[index],
            flags: renderedMap.flags[index],
            point: readGuildColorMapPoint(x, y, renderedMap.width, renderedMap.height, renderedMap.lightness),
        } satisfies MapSample;

        setSample(nextSample);
        return nextSample;
    }

    function selectMapColor(clientX: number, clientY: number) {
        const selectedSample = inspectMap(clientX, clientY);

        if (!selectedSample?.point.inGamut) {
            return;
        }

        const selectedColor = rgbToHex(selectedSample.point.rgb);

        setJumpInput(selectedColor);
        setTargetColor(selectedColor);
        setJumpError(null);
        replaceTargetQuery(selectedColor);
    }

    function startMapSelection(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (!event.isPrimary || event.button !== 0) {
            return;
        }

        activeMapPointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectMapColor(event.clientX, event.clientY);
    }

    function moveMapPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (activeMapPointerId.current === event.pointerId) {
            selectMapColor(event.clientX, event.clientY);
        } else {
            inspectMap(event.clientX, event.clientY);
        }
    }

    function stopMapSelection(event: ReactPointerEvent<HTMLCanvasElement>) {
        if (activeMapPointerId.current !== event.pointerId) {
            return;
        }

        activeMapPointerId.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function jumpToColor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedColor = normalizeGuildColorHex(jumpInput);
        const rgb = normalizedColor ? hexToRgb(normalizedColor) : null;

        if (!normalizedColor || !rgb) {
            setJumpError("Use a three- or six-digit hexadecimal color.");
            return;
        }

        setJumpInput(normalizedColor);
        setTargetColor(normalizedColor);
        setLightness(roundLightness(rgbToLab(rgb).L));
        setSample(null);
        setJumpError(null);
        replaceTargetQuery(normalizedColor);
    }

    function changeLightness(nextLightness: number) {
        setLightness(nextLightness);
        setTargetColor(null);
        setSample(null);
        setJumpError(null);
        replaceTargetQuery(null);
    }

    function toggleActivityFilter() {
        const enabled = !ignoreLowActivity;
        const url = new URL(window.location.href);

        if (enabled) {
            url.searchParams.set("ignoreLowActivity", "1");
        } else {
            url.searchParams.delete("ignoreLowActivity");
        }

        setIgnoreLowActivity(enabled);
        setSample(null);
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const renderedMapIsPreview = Boolean(renderedMap && renderedMap.width === GUILD_COLOR_MAP_PREVIEW_RESOLUTION);
    const requestedResolution = isAdjustingLightness ? GUILD_COLOR_MAP_PREVIEW_RESOLUTION : fullRenderResolution;
    const isRendering = Boolean(
        canRenderMap &&
            (!renderedMap || renderedMap.lightness !== lightness || renderedMap.width !== requestedResolution),
    );
    const statusText = loadError
        ? "Guild data unavailable"
        : !guildData
          ? "Loading guild colors"
          : activityFilterPending
            ? "Waiting for activity statistics"
          : renderError
            ? "Map rendering failed"
            : !renderedMap
              ? `Rendering L* ${lightness} · ${requestedResolution}px`
              : isRendering
                ? `Showing L* ${renderedMap.lightness} · ${renderedMap.width}px · updating to L* ${lightness} · ${requestedResolution}px`
                : `${renderedMapIsPreview ? "Previewing" : "Showing"} L* ${renderedMap.lightness} · ${renderedMap.width}px · ${renderedMap.renderTimeMs.toFixed(0)} ms`;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <MapIcon className="size-7 text-primary" aria-hidden="true" />
                    <h1 className="text-3xl font-bold tracking-tight">Guild Color Claim Map</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant={ignoreLowActivity ? "secondary" : "outline"}
                        aria-pressed={ignoreLowActivity}
                        onClick={toggleActivityFilter}
                    >
                        <Filter className="size-4" aria-hidden="true" />
                        Ignore low-activity guilds
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={guildColorRouteHref("/guild-color", targetColor, ignoreLowActivity)}>
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Back to picker
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/">Back to functions</Link>
                    </Button>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-[100rem] items-start gap-6 px-4 pb-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card className="min-w-0">
                    <CardHeader className="space-y-0 gap-3 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle>Perceptual color space</CardTitle>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <form className="flex items-center gap-2" onSubmit={jumpToColor}>
                                    <Label htmlFor="map-hex" className="sr-only">
                                        Jump to hex
                                    </Label>
                                    <Input
                                        id="map-hex"
                                        value={jumpInput}
                                        onChange={(event) => setJumpInput(event.currentTarget.value)}
                                        placeholder="#AABBCC"
                                        spellCheck={false}
                                        aria-invalid={Boolean(jumpError)}
                                        aria-describedby={jumpError ? "map-hex-error" : undefined}
                                        className="h-8 w-28 font-mono uppercase"
                                    />
                                    <Button type="submit" size="sm" variant="outline">
                                        Jump
                                    </Button>
                                </form>
                                <Badge variant="outline" role="status" aria-live="polite" data-testid="map-status">
                                    {statusText}
                                </Badge>
                            </div>
                        </div>
                        {jumpError ? (
                            <p id="map-hex-error" role="alert" className="text-xs text-red-300">
                                {jumpError}
                            </p>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:items-center">
                            <Label htmlFor="map-lightness">Lightness view</Label>
                            <input
                                id="map-lightness"
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={lightness}
                                onChange={(event) => changeLightness(Number(event.currentTarget.value))}
                                onPointerDown={() => setIsAdjustingLightness(true)}
                                onPointerUp={() => setIsAdjustingLightness(false)}
                                onPointerCancel={() => setIsAdjustingLightness(false)}
                                onLostPointerCapture={() => setIsAdjustingLightness(false)}
                                className="h-2 w-full cursor-pointer accent-primary"
                            />
                            <output htmlFor="map-lightness" className="w-20 font-mono text-sm font-semibold">
                                L* {lightness}
                            </output>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            <LegendItem
                                className="border-white/30 bg-gradient-to-br from-sky-300 to-fuchsia-400"
                                label="Allowed"
                            />
                            <LegendItem className="border-white/70 bg-slate-800" label="Guild claim" />
                            <LegendItem className="border-slate-500 bg-slate-950" label="Too dark" />
                            <LegendItem
                                className="border-slate-600 bg-[repeating-conic-gradient(#18181b_0_25%,#27272a_0_50%)] bg-[length:6px_6px]"
                                label="Outside RGB"
                            />
                            {allowedPercentage !== null ? (
                                <Badge variant="secondary" data-testid="map-coverage">
                                    {allowedPercentage.toFixed(1)}% allowed in this slice
                                </Badge>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <div
                            ref={mapContainerRef}
                            className="relative mx-auto aspect-square w-full max-w-[72rem] overflow-hidden rounded-xl border bg-black shadow-inner xl:w-[min(100%,calc(100dvh-19rem))]"
                        >
                            <canvas
                                ref={canvasRef}
                                role="img"
                                aria-label={`Guild color claims at Lab lightness ${renderedMap?.lightness ?? lightness}`}
                                className="size-full cursor-crosshair touch-none"
                                onPointerMove={moveMapPointer}
                                onPointerDown={startMapSelection}
                                onPointerUp={stopMapSelection}
                                onPointerCancel={stopMapSelection}
                                onLostPointerCapture={(event) => {
                                    if (activeMapPointerId.current === event.pointerId) {
                                        activeMapPointerId.current = null;
                                    }
                                }}
                            />
                            {targetColor && targetMarkerPosition && targetSample ? (
                                <span
                                    role="img"
                                    aria-label={`Selected color ${targetColor}`}
                                    className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0),0_0_10px_3px_rgb(255_255_255/0.8)]"
                                    style={{
                                        left: `${targetMarkerPosition.x}%`,
                                        top: `${targetMarkerPosition.y}%`,
                                    }}
                                />
                            ) : null}
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded bg-black/65 px-2 py-1 text-xs font-semibold">
                                Green −a*
                            </span>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-black/65 px-2 py-1 text-xs font-semibold">
                                +a* Red
                            </span>
                            <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-black/65 px-2 py-1 text-xs font-semibold">
                                Yellow +b*
                            </span>
                            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/65 px-2 py-1 text-xs font-semibold">
                                −b* Blue
                            </span>
                            {loadError ? (
                                <div className="absolute inset-0 grid place-items-center bg-background/90 p-6 text-center">
                                    <div className="max-w-md">
                                        <p className="font-semibold">Guild colors could not be loaded</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                                        >
                                            <RefreshCw className="size-4" aria-hidden="true" />
                                            Retry
                                        </Button>
                                    </div>
                                </div>
                            ) : !renderedMap || renderError ? (
                                <div className="absolute inset-0 grid place-items-center bg-background/85 p-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {renderError ??
                                            (activityFilterPending
                                                ? "Waiting for activity statistics before building the map…"
                                                : "Building the color-space view…")}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Claimed regions are derived from the nearest registered guild color within ΔE{" "}
                            {MIN_GUILD_COLOR_DELTA_E}. Move across the map to inspect a point; click, tap, or drag to
                            select its hex.
                        </p>
                    </CardContent>
                </Card>

                <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>Point details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeSample ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="size-12 shrink-0 rounded-lg border border-white/20 shadow-inner"
                                            style={{
                                                backgroundColor: activeSample.point.inGamut
                                                    ? rgbToHex(activeSample.point.rgb)
                                                    : undefined,
                                            }}
                                        />
                                        <div>
                                            <code className="font-semibold">
                                                {activeSample.point.inGamut
                                                    ? rgbToHex(activeSample.point.rgb)
                                                    : "Outside RGB"}
                                            </code>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                L* {activeSample.point.lab.L.toFixed(1)} · a*{" "}
                                                {activeSample.point.lab.a.toFixed(1)} · b*{" "}
                                                {activeSample.point.lab.b.toFixed(1)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {!sampleInGamut ? (
                                            <Badge variant="secondary">Outside RGB</Badge>
                                        ) : sampleAllowed ? (
                                            <Badge className="border-emerald-400/40 bg-emerald-400/15 text-emerald-200">
                                                Allowed
                                            </Badge>
                                        ) : (
                                            <Badge className="border-red-400/40 bg-red-400/15 text-red-200">
                                                Not allowed
                                            </Badge>
                                        )}
                                        {sampleInGamut && !sampleBrightEnough ? (
                                            <Badge variant="outline">Too dark</Badge>
                                        ) : null}
                                        {sampleGroup ? <Badge variant="outline">Guild claim</Badge> : null}
                                    </div>

                                    {sampleGroup ? (
                                        <div className="rounded-lg border bg-muted/25 p-3">
                                            <p className="text-sm font-semibold">{guildGroupLabel(sampleGroup)}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Registered {sampleGroup.color} · ΔE {sampleDistance?.toFixed(2)}
                                            </p>
                                            <ul className="mt-3 space-y-1.5 text-sm">
                                                {sampleGroup.guilds.map((guild) => (
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
                                    ) : sampleInGamut ? (
                                        <p className="text-sm text-muted-foreground">
                                            No registered guild color is within ΔE {MIN_GUILD_COLOR_DELTA_E}.
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Move over the map to inspect a color, or click, tap, or drag to select it.
                                </p>
                            )}
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
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary">
                                            {groups.length.toLocaleString()} unique colors
                                        </Badge>
                                        <Badge variant="secondary">
                                            {(activityFilterPending ? guildData.guilds : effectiveGuilds).length.toLocaleString()} guilds
                                        </Badge>
                                    </div>
                                    {ignoreLowActivity && statsStatus === "ready" ? (
                                        <p className="text-xs text-muted-foreground" data-testid="activity-filter-status">
                                            Ignoring {ignoredGuildCount.toLocaleString()} guild
                                            {ignoredGuildCount === 1 ? "" : "s"} missing from Wynncraft&apos;s guild directory
                                            or with 0 territories and both season ratings below{" "}
                                            {GUILD_ACTIVITY_RATING_THRESHOLD.toLocaleString()} SR.
                                        </p>
                                    ) : activityFilterPending ? (
                                        <p className="text-xs text-amber-200" data-testid="activity-filter-status">
                                            Waiting for activity statistics before filtering guild colors.
                                        </p>
                                    ) : activityFilterUnavailable ? (
                                        <p className="text-xs text-amber-200" data-testid="activity-filter-status">
                                            Activity filtering is unavailable. All guilds remain included
                                            {statsError ? `: ${statsError}` : "."}
                                        </p>
                                    ) : null}
                                    <p className="text-muted-foreground">
                                        Athena response timestamp: {new Date(guildData.fetchedAt).toLocaleString()}.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Excluded {guildData.excludedPlaceholderCount} placeholder entries using #C05F5F.
                                    </p>
                                </>
                            ) : loadError ? (
                                <p className="text-amber-200">Unavailable. No claim map was calculated.</p>
                            ) : (
                                <p className="text-muted-foreground">Loading from the same-origin proxy…</p>
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </main>
        </div>
    );
}
