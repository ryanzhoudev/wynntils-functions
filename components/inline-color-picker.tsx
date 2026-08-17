"use client";

import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "@/lib/guild-colors";
import { KeyboardEvent, PointerEvent, useRef, useState } from "react";

interface InlineColorPickerProps {
    value: string;
    onChange: (value: string) => void;
}

function clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
}

export default function InlineColorPicker({ value, onChange }: InlineColorPickerProps) {
    const planeRef = useRef<HTMLDivElement>(null);
    const rgb = hexToRgb(value) ?? { r: 255, g: 255, b: 255 };
    const hsv = rgbToHsv(rgb);
    const [grayHue, setGrayHue] = useState(hsv.h);
    const hue = hsv.s > 0 ? hsv.h : grayHue;

    function emitColor(saturation: number, brightness: number, nextHue = hue) {
        onChange(rgbToHex(hsvToRgb({ h: nextHue, s: saturation, v: brightness })));
    }

    function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
        const plane = planeRef.current;

        if (!plane) {
            return;
        }

        const bounds = plane.getBoundingClientRect();
        const saturation = clamp((event.clientX - bounds.left) / bounds.width);
        const brightness = clamp(1 - (event.clientY - bounds.top) / bounds.height);
        setGrayHue(hue);
        emitColor(saturation, brightness);
    }

    function handlePlaneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const step = event.shiftKey ? 0.1 : 0.02;
        let saturation = hsv.s;
        let brightness = hsv.v;

        if (event.key === "ArrowLeft") {
            saturation -= step;
        } else if (event.key === "ArrowRight") {
            saturation += step;
        } else if (event.key === "ArrowDown") {
            brightness -= step;
        } else if (event.key === "ArrowUp") {
            brightness += step;
        } else {
            return;
        }

        event.preventDefault();
        setGrayHue(hue);
        emitColor(clamp(saturation), clamp(brightness));
    }

    return (
        <div className="space-y-3">
            <div
                ref={planeRef}
                role="slider"
                tabIndex={0}
                aria-label="Saturation and brightness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsv.v * 100)}
                aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
                className="relative h-40 w-full cursor-crosshair touch-none overflow-hidden rounded-lg border shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                    backgroundColor: `hsl(${hue} 100% 50%)`,
                    backgroundImage:
                        "linear-gradient(to top, rgb(0 0 0), transparent), linear-gradient(to right, rgb(255 255 255), transparent)",
                }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updateFromPointer(event);
                }}
                onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        updateFromPointer(event);
                    }
                }}
                onKeyDown={handlePlaneKeyDown}
            >
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.85)]"
                    style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
                />
            </div>

            <div className="flex items-center gap-3">
                <span
                    role="img"
                    aria-label={`Current picker color ${value}`}
                    className="size-9 shrink-0 rounded-md border border-white/20 shadow-inner"
                    style={{ backgroundColor: value }}
                />
                <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={Math.round(hue)}
                    aria-label="Hue"
                    className="h-3 w-full cursor-pointer appearance-none rounded-full border border-white/15 bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgb(0_0_0/0.75)]"
                    onChange={(event) => {
                        const nextHue = Number(event.currentTarget.value);
                        setGrayHue(nextHue);
                        emitColor(hsv.s, hsv.v, nextHue);
                    }}
                />
            </div>
        </div>
    );
}
