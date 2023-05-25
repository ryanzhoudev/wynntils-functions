"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";

const ideElementId = "ide";

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);
    const [currentFunction, setCurrentFunction] = useState<Function | null>(null);

    const onInput = (event: React.ChangeEvent<HTMLElement>) => {
        const text = event.target.textContent ?? "";

        const caratPosition = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);

        const currentTypedWord = text.substring(startOfCurrentWord, caratPosition);

        const suggestions = getSuggestions(currentTypedWord, props.functions);
        setSuggestions(suggestions);
        setSelectedSuggestion(suggestions[0] ?? null);

        const newCurrentFunction = getCurrentFunction(text, caratPosition);
        setCurrentFunction(newCurrentFunction);
        if (
            newCurrentFunction != null &&
            suggestions.filter((suggestion) => suggestion.name != newCurrentFunction.name).length == 0
        ) {
            // just manually wrote a valid function, so clear suggestions unless there are other suggestions
            setSuggestions([]);
            setSelectedSuggestion(null);
        }
    };

    function insertSelectedSuggestion() {
        if (selectedSuggestion == null) return;

        const textArea = document.getElementById(ideElementId) as HTMLElement;
        const text: string = textArea.textContent ?? "";

        const selection = window.getSelection();
        const caratPosition = selection?.getRangeAt(0).startOffset ?? 0;

        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);
        const endOfCurrentWord = getEndOfCurrentWord(text, caratPosition);

        const preWordText = text.substring(0, startOfCurrentWord);
        const postWordText = text.substring(endOfCurrentWord);
        textArea.textContent = preWordText + selectedSuggestion.name + postWordText;

        const newCaratPosition = preWordText.length + selectedSuggestion.name.length;
        const range = document.createRange();
        range.setStart(textArea.childNodes[0], newCaratPosition);
        range.setEnd(textArea.childNodes[0], newCaratPosition);
        selection?.removeAllRanges();
        selection?.addRange(range);

        setSuggestions([]);
        const returnable = selectedSuggestion;
        setSelectedSuggestion(null);
        return returnable;
    }

    function getCurrentFunction(text: string, caratPosition: number) {
        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);
        const endOfCurrentWord = getEndOfCurrentWord(text, caratPosition);

        const currentWord = text.substring(startOfCurrentWord, endOfCurrentWord);

        return props.functions.find((func: Function) => {
            return func.name == currentWord || func.aliases.includes(currentWord);
        });
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key == "Tab" || event.key == "Enter") {
            event.preventDefault();
            const justInserted = insertSelectedSuggestion() ?? null;
            setCurrentFunction(justInserted);
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

    function getListElement(suggestion: Function, selected: boolean) {
        return (
            <li
                key={suggestion.name}
                className={"cursor-pointer py-1 px-2 hover:bg-zinc-800" + (selected ? " text-amber-300" : "")}
                onClick={() => insertSelectedSuggestion()}
                onMouseEnter={() => setSelectedSuggestion(suggestion)}
            >
                <code>{suggestion.name}</code>
                <code className="float-right">{suggestion.aliases.map((alias) => alias).join(", ")}</code>
            </li>
        );
    }

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
                <br></br>
            </code>
            {currentFunction != null ? (
                <div className="top-full mt-1 py-1 px-2 bg-zinc-700">
                    <code className="text-amber-300">{currentFunction.name}</code>
                    <code>
                        {"("}
                        {props.parameters
                            .filter((parameter: Parameter) => {
                                return parameter.functionId == currentFunction.id;
                            })
                            .map((parameter: Parameter) => {
                                return (
                                    <span key={parameter.name}>
                                        {parameter.name}
                                        <span className="text-gray-400">({parameter.type})</span>
                                        {"; "}
                                    </span>
                                );
                            })}
                        {")"}
                    </code>
                    <code className="text-amber-300">{" -> " + currentFunction.returnType}</code>
                    <code className="float-right">{currentFunction.aliases.map((alias) => alias).join(", ")}</code>
                    <br></br>
                    <code className="text-gray-400">{currentFunction.description}</code>
                </div>
            ) : (
                <span></span>
            )}
            {suggestions.length > 0 ? (
                <ul className="top-full mt-1 bg-zinc-700">
                    {suggestions.map((suggestion) =>
                        suggestion.name == selectedSuggestion?.name
                            ? getListElement(suggestion, true)
                            : getListElement(suggestion, false),
                    )}
                </ul>
            ) : (
                <span></span>
            )}
        </div>
    );
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
        } else {
            for (const alias of fn.aliases) {
                if (alias.startsWith(word) && !returnable.includes(fn)) {
                    returnable.push(fn);
                    break; // no need to check the rest of the aliases
                }
            }
        }
    }
    return returnable;
}
