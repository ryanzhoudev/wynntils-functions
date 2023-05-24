"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";

const ideElementId = "ide";

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);

    const onInput = (event: React.ChangeEvent<HTMLElement>) => {
        const text = event.target.textContent ?? "";

        const caratPosition = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);

        const currentTypedWord = text.substring(startOfCurrentWord, caratPosition);

        const suggestions = getSuggestions(currentTypedWord, props.functions);
        setSuggestions(suggestions);
        setSelectedSuggestion(suggestions[0] ?? null);
    };

    function insertSelectedSuggestion() {
        if (selectedSuggestion == null) return;

        const textArea = document.getElementById(ideElementId) as HTMLElement;
        const text: string = textArea.textContent ?? "";

        const selection = window.getSelection();
        const caratPosition = selection?.getRangeAt(0).startOffset ?? 0;

        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);
        const endOfCurrentWord = getEndOfCurrentWord(text, caratPosition);
        const existingStringLength = text.substring(startOfCurrentWord, caratPosition).length;
        const appendableString = selectedSuggestion.name.substring(existingStringLength);

        const preCaratText = text.substring(0, caratPosition) + appendableString;
        textArea.textContent = preCaratText + text.substring(endOfCurrentWord);

        const range = document.createRange();
        const newCaratPosition = preCaratText.length;
        range.setStart(textArea.childNodes[0], newCaratPosition);
        range.setEnd(textArea.childNodes[0], newCaratPosition);
        selection?.removeAllRanges();
        selection?.addRange(range);

        setSuggestions([]);
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key == "Tab") {
            event.preventDefault();
            insertSelectedSuggestion();
        }
    };

    const onClick = (clickedFunction: Function) => {
        if (clickedFunction == null) return;
        if (clickedFunction != selectedSuggestion) {
            setSelectedSuggestion(clickedFunction);
        } else {
            insertSelectedSuggestion();
        }
        if (suggestions.length == 0) {
            return;
        }
    };

    return (
        <div className="h-screen w-full p-8">
            <code
                id={ideElementId}
                contentEditable={true}
                suppressContentEditableWarning={true} // why do they care that's the entire point of contentEditable
                onInput={onInput}
                onKeyDown={onKeyDown}
                spellCheck={false}
                className="block bg-zinc-900 w-full text-white h-96 caret-white pl-2 pr-2 pt-1 pb-1 resize-none outline-none m-0 border-r-0"
            >
                {makeHighlightedCode("")}
            </code>
            {suggestions.length > 0 ? (
                <ul className="top-full mt-1 py-1 px-2 bg-zinc-700">
                    {suggestions.map((suggestion) =>
                        suggestion.name == selectedSuggestion?.name ? (
                            <li
                                key={suggestion.name}
                                className="cursor-pointer py-1 px-2 hover:bg-zinc-800 text-amber-300"
                                onClick={() => onClick(suggestion)}
                            >
                                <code>{suggestion.name}</code>
                            </li>
                        ) : (
                            <li
                                key={suggestion.name}
                                className="cursor-pointer py-1 px-2 hover:bg-zinc-800"
                                onClick={() => onClick(suggestion)}
                                onMouseEnter={() => setSelectedSuggestion(suggestion)}
                            >
                                <code>{suggestion.name}</code>
                            </li>
                        ),
                    )}
                </ul>
            ) : (
                <span></span>
            )}
        </div>
    );
}

function makeHighlightedCode(highlighted: string) {
    return <code className="bg-amber-300 text-zinc-700">{highlighted}</code>;
}

function getStartOfCurrentWord(text: string, caratPosition: number) {
    if (!text.includes(" ")) {
        return 0;
    }

    let i = caratPosition - 1;
    while (i >= 0 && text[i] != " ") {
        i--;
    }
    return i + 1;
}

function getEndOfCurrentWord(text: string, caratPosition: number) {
    if (!text.includes(" ")) {
        return text.length;
    }

    let i = caratPosition;
    while (i < text.length && text[i] != " ") {
        i++;
    }
    return i;
}

function getSuggestions(word: string, functions: Function[]): Function[] {
    if (functions.length == 0 || word == "") {
        return [];
    }

    const returnable: Function[] = [];
    for (const fn of functions) {
        if (fn.name.startsWith(word)) {
            returnable.push(fn);
        }
    }
    return returnable;
}
