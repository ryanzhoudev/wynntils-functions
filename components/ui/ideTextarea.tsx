"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";
import { getTextInCurrentParentheses, getStartIndexOfCurrentWord, getEndIndexOfCurrentWord } from "@/lib/stringUtils";

const ideElementId = "ide";

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);
    const [currentFunction, setCurrentFunction] = useState<Function | null>(null);
    const [currentFunctionParameter, setCurrentFunctionParameter] = useState<Parameter | null>(null);

    const onInput = (event: React.ChangeEvent<HTMLElement>) => {
        const text = event.target.textContent ?? "";

        const caretPosition = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
        const startOfCurrentWord = getStartIndexOfCurrentWord(text, caretPosition, true);

        const currentTypedWord = text.substring(startOfCurrentWord, caretPosition);

        const suggestions = getSuggestions(currentTypedWord, props.functions);
        setSuggestions(suggestions);
        setSelectedSuggestion(suggestions[0] ?? null);

        const newCurrentFunction = getCurrentFunction(text, caretPosition);
        setCurrentFunction(newCurrentFunction);
        setCurrentFunctionParameter(getCurrentParameter(text, caretPosition));
        if (
            newCurrentFunction != null &&
            suggestions.filter((suggestion) => suggestion.name != newCurrentFunction.name).length == 0
        ) {
            // just manually wrote a valid function, so clear suggestions unless there are other suggestions
            setSuggestions([]);
            setSelectedSuggestion(null);
        }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key == "Tab" || event.key == "Enter") {
            event.preventDefault();
            const justInserted = insertSelectedSuggestion() ?? null;
            if (justInserted != null) {
                setCurrentFunction(justInserted);
                setCurrentFunctionParameter(
                    props.parameters.filter((param: Parameter) => param.functionId == justInserted?.id)[0],
                );
            }
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

    function insertSelectedSuggestion() {
        if (selectedSuggestion == null) return;

        insertText(selectedSuggestion.name + "()", -1, -1);

        setSuggestions([]);
        const returnable = selectedSuggestion;
        setSelectedSuggestion(null);
        return returnable;
    }

    /**
     * Inserts the specified text at the current caret position.
     * Deletes deletePre characters to the left of the caret position before inserting.
     * If deletePre is -1, deletes the entire current word.
     * Sets the caret position to the end of the inserted text, plus the specified offset.
     */
    function insertText(insertable: string, deletePre: number, caretOffset: number) {
        const textArea = document.getElementById(ideElementId) as HTMLElement;
        const text: string = textArea.textContent ?? "";

        const selection = window.getSelection();
        const caretPosition = selection?.getRangeAt(0).startOffset ?? 1;

        let preInsertTextIndex;
        let postInsertTextIndex;

        if (deletePre == -1) {
            preInsertTextIndex = getStartIndexOfCurrentWord(text, caretPosition, true);
            postInsertTextIndex = getEndIndexOfCurrentWord(text, caretPosition, true);
        } else {
            preInsertTextIndex = caretPosition - deletePre;
            postInsertTextIndex = caretPosition;
        }

        const preInsertText = text.substring(0, preInsertTextIndex);
        const postInsertText = text.substring(postInsertTextIndex + 1); // FIXME: not sure why this +1 is needed but i guess if any issues arise with inserting text, this is the first place to look
        textArea.textContent = preInsertText + insertable + postInsertText;

        const newcaretPosition = preInsertText.length + insertable.length + caretOffset;
        const range = document.createRange();
        range.setStart(textArea.childNodes[0], newcaretPosition);
        range.setEnd(textArea.childNodes[0], newcaretPosition);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    function getCurrentFunction(text: string, caretPosition: number) {
        const startOfCurrentWord = getStartIndexOfCurrentWord(text, caretPosition, true);
        const endOfCurrentWord = getEndIndexOfCurrentWord(text, caretPosition, true);

        const currentWord = text.substring(startOfCurrentWord, endOfCurrentWord).split("(")[0];

        return props.functions.find((func: Function) => {
            return func.name == currentWord || func.aliases.includes(currentWord);
        });
    }

    /**
     * Requires currentFunction to be set and the caret to be inside the current function's parentheses.
     * Returns the current parameter selected at the caret position, or null if there are no parameters.
     */
    function getCurrentParameter(text: string, caretPosition: number) {
        const parameters: Parameter[] = props.parameters.filter(
            (param: Parameter) => param.functionId == currentFunction?.id,
        );
        if (parameters.length == 0) return null;

        // we can just get the number of semicolons to the left inside the parentheses to get the current parameter
        const numberOfSemicolonsToLeft = getTextInCurrentParentheses(text, caretPosition).split(";").length - 1;
        return parameters[numberOfSemicolonsToLeft];
    }

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
                <div className="top-full mt-1 py-1 px-2 bg-zinc-750">
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
                                        <span className="text-gray-500">({parameter.type})</span>
                                        {"; "}
                                    </span>
                                ) : (
                                    <span key={parameter.name} className="text-gray-400">
                                        {parameter.name}
                                        <span className="text-gray-500">({parameter.type})</span>
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
                    <br></br>
                    <br></br>
                    {props.parameters.filter((param: Parameter) => param.functionId == currentFunction.id).length ==
                    0 ? (
                        <code className="text-gray-400">No parameters.</code>
                    ) : (
                        props.parameters
                            .filter((param: Parameter) => param.functionId == currentFunction.id)
                            .map((param: Parameter) => {
                                return (
                                    <div key={param.name}>
                                        <code className="font-bold text-white">
                                            {param.name}
                                            {": "}
                                        </code>
                                        <code className="text-gray-400"> {param.description ?? "No description."}</code>
                                    </div>
                                );
                            })
                    )}
                </div>
            ) : (
                <span></span>
            )}
            {suggestions.length > 0 ? (
                <ul className="top-full mt-1 bg-zinc-750">
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
