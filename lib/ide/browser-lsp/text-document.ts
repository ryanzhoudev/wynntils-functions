import { LspPosition } from "@/lib/ide/types";

export type BrowserTextDocument = {
    uri: string;
    text: string;
    lineCount: number;
    getText: () => string;
    offsetAt: (position: LspPosition) => number;
    positionAt: (offset: number) => LspPosition;
};

export function createTextDocument(uri: string, text: string): BrowserTextDocument {
    const lineOffsets = computeLineOffsets(text);

    return {
        uri,
        text,
        lineCount: lineOffsets.length,
        getText: () => text,
        offsetAt: (position) => offsetAt(text, lineOffsets, position),
        positionAt: (offset) => positionAt(text, lineOffsets, offset),
    };
}

function computeLineOffsets(text: string) {
    const lineOffsets = [0];

    for (let index = 0; index < text.length; index++) {
        if (text.charCodeAt(index) === 10) {
            lineOffsets.push(index + 1);
        }
    }

    return lineOffsets;
}

function offsetAt(text: string, lineOffsets: number[], position: LspPosition) {
    if (position.line >= lineOffsets.length) {
        return text.length;
    }

    if (position.line < 0) {
        return 0;
    }

    const lineOffset = lineOffsets[position.line];
    const nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : text.length;

    return Math.max(lineOffset, Math.min(lineOffset + position.character, nextLineOffset));
}

function positionAt(text: string, lineOffsets: number[], rawOffset: number): LspPosition {
    const offset = Math.max(0, Math.min(rawOffset, text.length));
    let low = 0;
    let high = lineOffsets.length;

    while (low < high) {
        const mid = Math.floor((low + high) / 2);

        if (lineOffsets[mid] > offset) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }

    const line = Math.max(0, low - 1);

    return {
        line,
        character: offset - lineOffsets[line],
    };
}
