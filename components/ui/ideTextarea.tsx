"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";
import { param } from "ts-interface-checker";
import { run } from "node:test";

const ideElementId = "ide";
const wordSeparators: string[] = [" ", "(", ")", "{", "}"];

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);

    const onInput = (event: React.ChangeEvent<HTMLElement>) => {
        const text = event.target.textContent ?? "";

        let caratPosition = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);

        const currentTypedWord = text.substring(startOfCurrentWord, caratPosition);

        const suggestions = getSuggestions(currentTypedWord, props.functions);
        setParameters(props.parameters);
        setSuggestions(suggestions);
        setSelectedSuggestion(suggestions[0] ?? null);

        const matching = getIndexOfMatchingParenthesis(text, caratPosition - 1);
        const ideArea = document.getElementById(ideElementId) as HTMLElement;
        if (matching >= 0) {
            const newDisplayedText = getDisplayedText(
                ideArea.textContent ?? "",
                Math.min(matching, caratPosition - 1),
                Math.max(matching, caratPosition - 1),
            );
            ideArea.innerHTML = newDisplayedText[0] as string;

            // we have to do a bunch of weird stuff with the carat since it is no longer in the same child node after adding highlights
            // this sets it to be between the two highlighted characters
            moveCarat(ideArea.childNodes.length - 1, caratPosition - (newDisplayedText[1] as number));
        } else {
            if (ideArea.childNodes[0] != null) {
                moveCarat(0, caratPosition);
            }
        }
    };

    function getDisplayedText(text: string, first: number, second: number) {
        const firstNoHighlight = text.substring(0, first);

        const firstHighlightedRawCharacter = text.substring(first, first + 1);
        const firstHighlightedCharacter = makeHighlightedCode(firstHighlightedRawCharacter);

        const middleText = text.substring(first + 2, second + 1);

        const secondHighlightedRawCharacter = text.substring(second, second + 1);
        const secondHighlightedCharacter = makeHighlightedCode(secondHighlightedRawCharacter);

        const secondNoHighlight = text.substring(second + 1);

        console.log("first no highlight: " + firstNoHighlight);
        console.log("first highlighted character: " + firstHighlightedCharacter);
        console.log("middle text: " + middleText);
        console.log("second highlighted character: " + secondHighlightedCharacter);
        console.log("second no highlight: " + secondNoHighlight);

        let returnable: (string | number)[] = [
            firstNoHighlight + firstHighlightedCharacter + middleText + secondHighlightedCharacter + secondNoHighlight,
        ];
        returnable[1] =
            firstNoHighlight.length +
            firstHighlightedRawCharacter.length +
            middleText.length +
            secondHighlightedRawCharacter.length;

        return returnable;
    }

    function insertSelectedSuggestion() {
        if (selectedSuggestion == null) return;

        const textArea = document.getElementById(ideElementId) as HTMLElement;
        const text: string = textArea.textContent ?? "";

        const selection = window.getSelection();
        const caratPosition = selection?.getRangeAt(0).startOffset ?? 0;

        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);
        const endOfCurrentWord = getEndOfCurrentWord(text, caratPosition);
        const existingStringLength = text.substring(startOfCurrentWord, caratPosition).length;
        let appendableString = selectedSuggestion.name.substring(existingStringLength);
        if (parameters.filter((parameter) => parameter.functionId == selectedSuggestion.id).length > 0) {
            appendableString = appendableString + "()";
        }

        const preCaratText = text.substring(0, caratPosition) + appendableString;
        textArea.textContent = preCaratText + text.substring(endOfCurrentWord);

        let newCaratPosition = preCaratText.length;
        if (appendableString.endsWith(")")) {
            newCaratPosition -= 1;
        }
        moveCarat(0, newCaratPosition);

        setSuggestions([]);
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key == "Tab" || event.key == "Enter") {
            event.preventDefault();
            insertSelectedSuggestion();
        } else if (event.key == "ArrowUp") {
            event.preventDefault();
            setSelectedSuggestion(
                suggestions[suggestions.indexOf(selectedSuggestion ?? suggestions[0]) - 1] ?? suggestions[0],
            );
        } else if (event.key == "ArrowDown") {
            event.preventDefault();
            setSelectedSuggestion(
                suggestions[suggestions.indexOf(selectedSuggestion ?? suggestions[0]) + 1] ??
                    suggestions[suggestions.length - 1],
            );
        }
    };

    const onClick = (clickedFunction: Function) => {
        if (clickedFunction == null || suggestions.length == 0) return;
        if (clickedFunction != selectedSuggestion) {
            // This should not really happen since there are onMouseEnter events
            setSelectedSuggestion(clickedFunction);
        } else {
            insertSelectedSuggestion();
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
                className="block bg-zinc-900 w-full text-white h-96 caret-white p-2 resize-none outline-none m-0 border-r-0"
            >
                {/*firefox doesn't like empty contentEditable elements, the <br> tags fix it*/}
                <code></code>
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
    // we have to use class instead of className because tailwind is not doing shit
    return `<code class="bg-green-900">${highlighted}</code>`;
}

function moveCarat(childNode: number, position: number) {
    const textArea = document.getElementById(ideElementId) as HTMLElement;
    const selection = window.getSelection();

    const range = document.createRange();
    range.setStart(textArea.childNodes[childNode], position);
    range.setEnd(textArea.childNodes[childNode], position);
    selection?.removeAllRanges();
    selection?.addRange(range);
}

function getIndexOfMatchingParenthesis(text: string, parenthesisIndex: number) {
    /*
    essentially what we are doing here is
    we are going to iterate either forwards or backwards depending on what the parenthesis is at parenthesisIndex
    every time we encounter a paren of the same type as the one at parenthesisIndex, we increment a counter openParenCount
    every time we encounter a paren of the opposite type, we decrement openParenCount
    when openParenCount == 0, we have found the matching paren and we can return its index
    if we reach the end of the string and openParenCount != 0, then we never found the matching paren and we return null
     */
    if (text[parenthesisIndex] == "(") {
        // we are looking for the closing paren, which should be to the right
        let i = parenthesisIndex + 1; // start at the character to the right of the opening paren, otherwise we will find the opening paren again
        if (i >= text.length) {
            // There is definitely not a closing paren to the right since we are already at the end of the string
            return -1;
        }
        let openParenCount = 1;
        while (i < text.length) {
            const char = text[i];
            if (char == "(") {
                openParenCount++;
            } else if (char == ")") {
                openParenCount--;
                if (openParenCount <= 0) {
                    return i;
                }
            }
            i++;
        }
    } else if (text[parenthesisIndex] == ")") {
        // we are looking for the opening paren, which should be to the left
        let i = parenthesisIndex - 1; // start at the character to the left of the closing paren, otherwise we will find the closing paren again
        if (i < 0) {
            // There is definitely not an opening paren to the left since we are already at the start of the string
            return -1;
        }
        let openParenCount = 1;
        while (i >= 0) {
            const char = text[i];
            if (char == ")") {
                openParenCount++;
            } else if (char == "(") {
                openParenCount--;
                if (openParenCount <= 0) {
                    return i;
                }
            }
            i--;
        }
    }
    return -1; // we never found the matching paren
}

function getStartOfCurrentWord(text: string, caratPosition: number) {
    if (!text.includes(" ")) {
        return 0;
    }

    let i = caratPosition - 1;
    while (i >= 0 && !wordSeparators.includes(text[i])) {
        i--;
    }
    return i + 1;
}

function getEndOfCurrentWord(text: string, caratPosition: number) {
    if (!text.includes(" ")) {
        return text.length;
    }

    let i = caratPosition;
    while (i < text.length && !wordSeparators.includes(text[i])) {
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
