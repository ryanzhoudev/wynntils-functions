"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GuildStatsLink from "@/components/guild-stats-link";
import {
    classifyGuildColorMapPoint,
    createGuildColorMapGroups,
    GUILD_COLOR_MAP_A_MAX,
    GUILD_COLOR_MAP_A_MIN,
    GUILD_COLOR_MAP_B_MAX,
    GUILD_COLOR_MAP_B_MIN,
    GUILD_COLOR_MAP_DEFAULT_LIGHTNESS,
    GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH,
    GUILD_COLOR_MAP_FLAG_IN_GAMUT,
    GUILD_COLOR_MAP_PREVIEW_RESOLUTION,
    GUILD_COLOR_MAP_RESOLUTION,
    guildColorMapFullResolution,
    GuildColorMapGroup,
    GuildColorMapRenderResponse,
    GuildColorMapWorkerResponse,
    labToMapPosition,
    readGuildColorMapPoint,
} from "@/lib/guild-color-map";
import {
    createGuildColorPalette,
    deltaE76,
    GuildColorApiResponse,
    hexToRgb,
    MIN_GUILD_COLOR_DELTA_E,
    normalizeGuildColorHex,
    rgbToLab,
    rgbToHex,
} from "@/lib/guild-colors";
import { cn } from "@/lib/utils";
import { ArrowLeft, Database, Map as MapIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

interface MapSample {
    x: number;
    y: number;
    ownerIndex: number;
    flags: number;
    point: ReturnType<typeof readGuildColorMapPoint>;
}

interface GuildColorMapProps {
    initialColor: string | null;
}

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

    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function parseApiError(payload: unknown): string {
    if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
        return payload.error;
    }

    return "Guild color data is temporarily unavailable.";
}

function guildGroupLabel(group: GuildColorMapGroup): string {
    if (group.guilds.length === 1) {
        const guild = group.guilds[0];
        return `${guild.name} [${guild.prefix.toUpperCase()}]`;
    }

    return `${group.guilds.length} guilds share ${group.color}`;
}

function LegendItem({
    className,
    label,
}: {
    className: string;
    label: string;
}) {
    return (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className={cn("size-3 rounded-sm border", className)} />
            {label}
        </span>
    );
}

export default function GuildColorMap({ initialColor }: GuildColorMapProps) {
    const normalizedInitialColor = normalizeGuildColorHex(initialColor ?? "");
    const initialRgb = normalizedInitialColor ? hexToRgb(normalizedInitialColor) : null;
    const initialLightness = initialRgb
        ? roundLightness(rgbToLab(initialRgb).L)
        : GUILD_COLOR_MAP_DEFAULT_LIGHTNESS;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const latestRequestId = useRef(0);
    const latestRenderedRequestId = useRef(0);
    const [lightness, setLightness] = useState(initialLightness);
    const [isAdjustingLightness, setIsAdjustingLightness] = useState(false);
    const [fullRenderResolution, setFullRenderResolution] = useState(GUILD_COLOR_MAP_RESOLUTION);
    const [guildData, setGuildData] = useState<GuildColorApiResponse | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [renderedMap, setRenderedMap] = useState<GuildColorMapRenderResponse | null>(null);
    const [sample, setSample] = useState<MapSample | null>(null);
    const [jumpInput, setJumpInput] = useState(normalizedInitialColor ?? initialColor ?? "");
    const [targetColor, setTargetColor] = useState<string | null>(normalizedInitialColor);
    const [jumpError, setJumpError] = useState<string | null>(
        initialColor && !normalizedInitialColor ? "Use a three- or six-digit hexadecimal color." : null,
    );
    const groups = useMemo(
        () => createGuildColorMapGroups(createGuildColorPalette(guildData?.guilds ?? [])),
        [guildData],
    );
    const workerGroups = useMemo(
        () => groups.map(({ color, lab }) => ({ color, lab })),
        [groups],
    );
    const target = useMemo(() => {
        const rgb = targetColor ? hexToRgb(targetColor) : null;

        return rgb ? { rgb, lab: rgbToLab(rgb) } : null;
    }, [targetColor]);
    const targetRgb = target?.rgb ?? null;
    const targetLab = target?.lab ?? null;
    const targetSample = useMemo(() => {
        if (!renderedMap || !targetRgb || !targetLab || Math.abs(renderedMap.lightness - lightness) > 0.001) {
            return null;
        }

        const position = labToMapPosition(targetLab, renderedMap.width, renderedMap.height);
        const x = Math.min(renderedMap.width - 1, Math.max(0, Math.round(position.x)));
        const y = Math.min(renderedMap.height - 1, Math.max(0, Math.round(position.y)));
        const point = { lab: targetLab, rgb: targetRgb, inGamut: true };
        const classification = classifyGuildColorMapPoint(point, workerGroups);

        return {
            x,
            y,
            ownerIndex: classification.claimed ? classification.closestGroupIndex : -1,
            flags:
                GUILD_COLOR_MAP_FLAG_IN_GAMUT |
                (classification.brightEnough ? GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH : 0),
            point,
        } satisfies MapSample;
    }, [lightness, renderedMap, targetLab, targetRgb, workerGroups]);
    const activeSample = sample ?? targetSample;
    const sampleGroup =
        activeSample?.ownerIndex !== undefined && activeSample.ownerIndex >= 0
            ? groups[activeSample.ownerIndex]
            : null;
    const sampleInGamut = Boolean(activeSample && (activeSample.flags & GUILD_COLOR_MAP_FLAG_IN_GAMUT) !== 0);
    const sampleBrightEnough = Boolean(
        activeSample && (activeSample.flags & GUILD_COLOR_MAP_FLAG_BRIGHT_ENOUGH) !== 0,
    );
    const sampleAllowed = sampleInGamut && sampleBrightEnough && !sampleGroup;
    const sampleDistance = activeSample && sampleGroup ? deltaE76(activeSample.point.lab, sampleGroup.lab) : null;
    const targetMarkerPosition = targetLab
        ? {
              left:
                  ((targetLab.a - GUILD_COLOR_MAP_A_MIN) /
                      (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN)) *
                  100,
              top:
                  ((GUILD_COLOR_MAP_B_MAX - targetLab.b) /
                      (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN)) *
                  100,
          }
        : null;
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

        return () => controller.abort();
    }, [loadAttempt]);

    useEffect(() => {
        const worker = new Worker(new URL("../lib/guild-color-map/worker.ts", import.meta.url), {
            type: "module",
        });
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<GuildColorMapWorkerResponse>) => {
            const response = event.data;

            if (response.requestId < latestRenderedRequestId.current) {
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
        if (!workerRef.current || !guildData || workerGroups.length === 0) {
            return;
        }

        const requestId = latestRequestId.current + 1;
        const resolution = isAdjustingLightness
            ? GUILD_COLOR_MAP_PREVIEW_RESOLUTION
            : fullRenderResolution;
        latestRequestId.current = requestId;
        workerRef.current.postMessage({
            type: "render",
            requestId,
            lightness,
            width: resolution,
            height: resolution,
            groups: workerGroups,
        });
    }, [fullRenderResolution, guildData, isAdjustingLightness, lightness, workerGroups]);

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

    function inspectMap(clientX: number, clientY: number) {
        const canvas = canvasRef.current;

        if (!canvas || !renderedMap) {
            return;
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

        setSample({
            x,
            y,
            ownerIndex: renderedMap.owners[index],
            flags: renderedMap.flags[index],
            point: readGuildColorMapPoint(x, y, renderedMap.width, renderedMap.height, renderedMap.lightness),
        });
    }

    function jumpToColor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedColor = normalizeGuildColorHex(jumpInput);

        if (!normalizedColor) {
            setJumpError("Use a three- or six-digit hexadecimal color.");
            return;
        }

        const rgb = hexToRgb(normalizedColor);

        if (!rgb) {
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

    const renderedMapIsPreview = Boolean(
        renderedMap && renderedMap.width === GUILD_COLOR_MAP_PREVIEW_RESOLUTION,
    );
    const requestedResolution = isAdjustingLightness
        ? GUILD_COLOR_MAP_PREVIEW_RESOLUTION
        : fullRenderResolution;
    const isRendering = Boolean(
        guildData &&
        (!renderedMap ||
            renderedMap.lightness !== lightness ||
            renderedMap.width !== requestedResolution),
    );
    const statusText = loadError
        ? "Guild data unavailable"
        : !guildData
          ? "Loading guild colors"
          : renderError
            ? "Map rendering failed"
            : !renderedMap
              ? `Rendering L* ${lightness} · ${requestedResolution}px`
              : isRendering
                ? `Showing L* ${renderedMap.lightness} · ${renderedMap.width}px · updating to L* ${lightness} · ${requestedResolution}px`
                : `${renderedMapIsPreview ? "Previewing" : "Showing"} L* ${renderedMap.lightness} · ${renderedMap.width}px · ${renderedMap.renderTimeMs.toFixed(0)} ms`;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <MapIcon className="size-7 text-primary" aria-hidden="true" />
                    <h1 className="text-3xl font-bold tracking-tight">Guild Color Claim Map</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href={targetColor ? `/guild-color?hex=${targetColor.slice(1)}` : "/guild-color"}>
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
                            <LegendItem className="border-white/30 bg-gradient-to-br from-sky-300 to-fuchsia-400" label="Allowed" />
                            <LegendItem className="border-white/70 bg-slate-800" label="Guild claim" />
                            <LegendItem className="border-slate-500 bg-slate-950" label="Too dark" />
                            <LegendItem className="border-slate-600 bg-[repeating-conic-gradient(#18181b_0_25%,#27272a_0_50%)] bg-[length:6px_6px]" label="Outside RGB" />
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
                                onPointerMove={(event) => inspectMap(event.clientX, event.clientY)}
                                onPointerDown={(event) => inspectMap(event.clientX, event.clientY)}
                            />
                            {targetColor && targetMarkerPosition && targetSample ? (
                                <span
                                    role="img"
                                    aria-label={`Selected color ${targetColor}`}
                                    className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0),0_0_10px_3px_rgb(255_255_255/0.8)]"
                                    style={{
                                        left: `${targetMarkerPosition.left}%`,
                                        top: `${targetMarkerPosition.top}%`,
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
                                        {renderError ?? "Building the color-space view…"}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Claimed regions are derived from the nearest registered guild color within ΔE{" "}
                            {MIN_GUILD_COLOR_DELTA_E}. Move across the map to inspect a point.
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
                                                <ul className="mt-3 space-y-1 text-sm">
                                                    {sampleGroup.guilds.map((guild) => (
                                                        <li key={`${guild.name}-${guild.prefix}`}>
                                                            <GuildStatsLink guild={guild} />
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
                                    Move over or tap the map to inspect a color and its nearest claim.
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
                                            {guildData.guilds.length.toLocaleString()} guilds
                                        </Badge>
                                    </div>
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
