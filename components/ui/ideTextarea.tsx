"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";

const ideElementId = "ide";

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);
    const [currentFunction, setCurrentFunction] = useState<Function | null>(null);
    const [currentFunctionParameter, setCurrentFunctionParameter] = useState<Parameter | null>(null);

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
        setCurrentFunctionParameter(getCurrentParameter(text, caratPosition));
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

        insertText(selectedSuggestion.name + "()", -1, -1);

        setSuggestions([]);
        const returnable = selectedSuggestion;
        setSelectedSuggestion(null);
        return returnable;
    }

    /**
     * Inserts the specified text at the current carat position.
     * Deletes deletePre characters to the left of the carat position before inserting.
     * If deletePre is -1, deletes the entire current word.
     * Sets the carat position to the end of the inserted text, plus the specified offset.
     */
    function insertText(insertable: string, deletePre: number, caratOffset: number) {
        const textArea = document.getElementById(ideElementId) as HTMLElement;
        const text: string = textArea.textContent ?? "";

        const selection = window.getSelection();
        const caratPosition = selection?.getRangeAt(0).startOffset ?? 0;

        if (deletePre == -1) {
            deletePre = getEndOfCurrentWord(text, caratPosition) - getStartOfCurrentWord(text, caratPosition);
        }

        const preInsertText = text.substring(0, caratPosition - deletePre);
        const postInsertText = text.substring(getEndOfCurrentWord(text, caratPosition));
        textArea.textContent = preInsertText + insertable + postInsertText;

        const newCaratPosition = preInsertText.length + insertable.length + caratOffset;
        const range = document.createRange();
        range.setStart(textArea.childNodes[0], newCaratPosition);
        range.setEnd(textArea.childNodes[0], newCaratPosition);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    function getCurrentFunction(text: string, caratPosition: number) {
        const startOfCurrentWord = getStartOfCurrentWord(text, caratPosition);
        const endOfCurrentWord = getEndOfCurrentWord(text, caratPosition);

        const currentWord = text.substring(startOfCurrentWord, endOfCurrentWord).split("(")[0];

        return props.functions.find((func: Function) => {
            return func.name == currentWord || func.aliases.includes(currentWord);
        });
    }

    /**
     * Requires currentFunction to be set and the carat to be inside the current function's parentheses.
     */
    function getCurrentParameter(text: string, caratPosition: number) {
        const parameters: Parameter[] = props.parameters.filter(
            (param: Parameter) => param.functionId == currentFunction?.id,
        );
        if (parameters.length == 0) return null;

        // we can just get the number of semicolons to the left inside the parentheses to get the current parameter
        const numberOfSemicolonsToLeft = getTextInCurrentParentheses(text, caratPosition).split(";").length - 1;
        return parameters[numberOfSemicolonsToLeft];
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key == "Tab" || event.key == "Enter") {
            event.preventDefault();
            const justInserted = insertSelectedSuggestion() ?? null;
            setCurrentFunction(justInserted);
            setCurrentFunctionParameter(
                props.parameters.filter((param: Parameter) => param.functionId == justInserted?.id)[0],
            );
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
                                return parameter.name == currentFunctionParameter?.name ? (
                                    <span key={parameter.name} className="font-bold text-white">
                                        {parameter.name}
                                        <span className="text-gray-600">({parameter.type})</span>
                                        {"; "}
                                    </span>
                                ) : (
                                    <span key={parameter.name} className="text-gray-300">
                                        {parameter.name}
                                        <span className="text-gray-600">({parameter.type})</span>
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

/**
 * Should be called when the caret is inside some parentheses.
 */
function getTextInCurrentParentheses(text: string, caretPosition: number) {
    let start: number = 0;
    let end: number = text.length - 1;

    let i = caretPosition;
    let openParentheses = 0;
    while (i >= 0) {
        if (text[i] == ")") {
            openParentheses++;
        } else if (text[i] == "(") {
            openParentheses--;
        }
        if (openParentheses == 0) {
            start = i;
            break;
        }
        i--;
    }

    i = caretPosition;
    openParentheses = 1;
    while (i < text.length) {
        if (text[i] == "(") {
            openParentheses++;
        } else if (text[i] == ")") {
            openParentheses--;
        }
        if (openParentheses == 0) {
            end = i;
            break;
        }
        i++;
    }
    return text.substring(start, end + 1);
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
