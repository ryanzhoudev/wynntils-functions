"use client";

import React, { useState } from "react";
import { Function, Parameter } from ".prisma/client";
import {
    getEndIndexOfCurrentWord,
    getStartIndexOfCurrentWord,
    getTextInCurrentParentheses,
    Separators,
} from "@/lib/stringUtils";

const ideElementId = "ide";

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<Function | null>(null);
    const [currentFunction, setCurrentFunction] = useState<Function | null>(null);
    const [currentFunctionParameter, setCurrentFunctionParameter] = useState<Parameter | null>(null);
    const [currentFunctionParameterTypeCorrect, setCurrentFunctionParameterTypeCorrect] = useState<boolean>(false);

    function processInput(text: string) {
        const caretPosition = getCaretPosition();
        const startOfCurrentWord = getStartIndexOfCurrentWord(text, caretPosition, 0, [
            ...Separators.SPACES,
            ...Separators.PARENTHESES,
        ]);

        const currentPartialWord = text.substring(startOfCurrentWord, caretPosition);

        const suggestions = getSuggestions(currentPartialWord, props.functions);
        setSuggestions(suggestions);
        setSelectedSuggestion(suggestions[0] ?? null);

        const newCurrentFunction = getCurrentFunction(text, caretPosition, props.functions) ?? null;
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

        // Parameter parsing
        if (currentFunctionParameter != null) {
            const startOfCurrentParameter = getStartIndexOfCurrentWord(text, caretPosition, 0, [
                ...Separators.PARENTHESES,
                ...Separators.SEMICOLONS,
            ]);
            const endOfCurrentParameter = getEndIndexOfCurrentWord(text, caretPosition, 0, [
                ...Separators.PARENTHESES,
                ...Separators.SEMICOLONS,
            ]);
            const currentParameterInput = text.substring(startOfCurrentParameter, endOfCurrentParameter + 1);

            const parameterFunction: Function | null = getFunction(
                true,
                currentParameterInput.replace("(", "").replace(")", ""),
                props.functions,
            );
            if (parameterFunction != null) {
                // Since we found a valid function name, we can assume that the user is trying to write a function call
                // Check the return type of the function and make sure it matches the type of the current parameter
                if (parameterFunction.returnType == currentFunctionParameter.type) {
                    setCurrentFunctionParameterTypeCorrect(true);
                }
            } else {
                // Since we didn't find a valid function name, we can assume that the user is trying to write a literal
                switch (currentFunctionParameter.type) {
                    case "String":
                        if (
                            currentParameterInput.startsWith('"') &&
                            currentParameterInput.endsWith('"') &&
                            currentParameterInput.length > 1
                        ) {
                            setCurrentFunctionParameterTypeCorrect(true);
                        } else {
                            setCurrentFunctionParameterTypeCorrect(false);
                        }
                        break;
                    case "Number" || "Double":
                        if (currentParameterInput != "" && !isNaN(Number(currentParameterInput))) {
                            setCurrentFunctionParameterTypeCorrect(true);
                        } else {
                            setCurrentFunctionParameterTypeCorrect(false);
                        }
                        break;
                    case "Integer":
                        if (
                            currentParameterInput != "" &&
                            !isNaN(Number(currentParameterInput)) &&
                            Number(currentParameterInput) % 1 == 0
                        ) {
                            setCurrentFunctionParameterTypeCorrect(true);
                        } else {
                            setCurrentFunctionParameterTypeCorrect(false);
                        }
                        break;
                    case "Boolean":
                        if (currentParameterInput == "true" || currentParameterInput == "false") {
                            setCurrentFunctionParameterTypeCorrect(true);
                        } else {
                            setCurrentFunctionParameterTypeCorrect(false);
                        }
                        break;
                }
            }
        }
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

    function insertSelectedSuggestion() {
        if (selectedSuggestion == null) return;

        insertText(selectedSuggestion.name + "()", -1, -1);
        setCurrentFunction(selectedSuggestion);

        const returnable = selectedSuggestion;
        setSuggestions([]);
        setSelectedSuggestion(null);
        return returnable;
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
            <div className={"absolute p-2"}>
                <code className={"bg-green-900 bg-opacity-50"}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</code>
            </div>
            <code
                id={ideElementId}
                contentEditable={true}
                suppressContentEditableWarning={true} // why do they care that's the entire point of contentEditable
                spellCheck={false}
                onKeyDown={onKeyDown}
                onSelect={() => {
                    // called whenever user "selects" text, including when they move the caret by typing or whatever
                    processInput(document.getElementById(ideElementId)?.textContent ?? "");
                }}
                className="block bg-zinc-900 w-full text-white h-96 caret-white p-2 resize-none outline-none m-0 border-r-0"
            >
                {/*firefox doesn't like empty contentEditable elements, the <br> tags fix it*/}
                <br></br>
            </code>

            {currentFunction != null && (
                <div className="top-full mt-1 py-1 px-2 bg-zinc-750">
                    <code className="text-amber-300">{currentFunction.name}</code>
                    <code>
                        {"("}
                        {props.parameters
                            .filter((parameter: Parameter) => {
                                return parameter.functionId == currentFunction.id;
                            })
                            .map((parameter: Parameter) => {
                                return (
                                    <span
                                        key={parameter.name}
                                        className={
                                            parameter.name == currentFunctionParameter?.name
                                                ? currentFunctionParameterTypeCorrect
                                                    ? "font-bold text-white"
                                                    : "font-bold text-red-500"
                                                : "text-gray-400"
                                        }
                                    >
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
            )}
            {suggestions.length > 0 && (
                <ul className="top-full mt-1 bg-zinc-750">
                    {suggestions.map((suggestion) =>
                        getListElement(suggestion, suggestion.name == selectedSuggestion?.name),
                    )}
                </ul>
            )}
        </div>
    );
}

function getCaretPosition() {
    const ideElement = document.getElementById(ideElementId);
    let caretPos = 0;
    if (ideElement) {
        let selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const clonedRange = range.cloneRange();
            clonedRange.selectNodeContents(ideElement);
            clonedRange.setEnd(range.endContainer, range.endOffset);
            caretPos = clonedRange.toString().length;
        }
    }
    return caretPos;
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
    const caretPosition = getCaretPosition();

    let preInsertTextIndex;
    let postInsertTextIndex;

    if (deletePre == -1) {
        preInsertTextIndex = getStartIndexOfCurrentWord(text, caretPosition, 0, [
            ...Separators.SPACES,
            ...Separators.PARENTHESES,
        ]);
        postInsertTextIndex = getEndIndexOfCurrentWord(text, caretPosition, 0, [
            ...Separators.SPACES,
            ...Separators.PARENTHESES,
        ]);
    } else {
        preInsertTextIndex = caretPosition - deletePre;
        postInsertTextIndex = caretPosition;
    }

    const preInsertText = text.substring(0, preInsertTextIndex);
    const postInsertText = text.substring(postInsertTextIndex + 1); // FIXME: not sure why this +1 is needed but i guess if any issues arise with inserting text, this is the first place to look
    textArea.textContent = preInsertText + insertable + postInsertText;

    const newCaretPosition = preInsertText.length + insertable.length + caretOffset;
    const range = document.createRange();
    range.setStart(textArea.childNodes[0], newCaretPosition);
    range.setEnd(textArea.childNodes[0], newCaretPosition);
    selection?.removeAllRanges();
    selection?.addRange(range);
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

/**
 * Returns the first function that matches the name or alias if applicable.
 */
function getFunction(includeAliases: boolean, name: string, functions: Function[]): Function | null {
    return (
        functions.find((func: Function) => {
            return func.name == name || (includeAliases && func.aliases.includes(name));
        }) ?? null
    );
}

function getCurrentFunction(text: string, caretPosition: number, functions: Function[]) {
    const parenthesesCount = text.split("(").length - 1;
    const startOfCurrentWord = getStartIndexOfCurrentWord(text, caretPosition, parenthesesCount / 2, [
        ...Separators.SPACES,
        ...Separators.PARENTHESES,
    ]);
    const endOfCurrentWord = getEndIndexOfCurrentWord(text, caretPosition, parenthesesCount / 2, [
        ...Separators.SPACES,
        ...Separators.PARENTHESES,
    ]);

    const currentWord = text.substring(startOfCurrentWord, endOfCurrentWord).split("(")[0];

    return functions.find((func: Function) => {
        return func.name == currentWord || func.aliases.includes(currentWord);
    });
}
