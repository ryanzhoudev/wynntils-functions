"use client";
import { Roboto_Mono } from "next/font/google";
import { useState } from "react";
import { Function, Parameter } from ".prisma/client";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<Function[]>([]);
    const [selectedSuggestion, setSelectedSuggestions] = useState<Function | null>(null);

    const onChange = (event: any) => {
        const textArea = event.target as HTMLTextAreaElement;
        const start = findStartOfLastWord(textArea.value);
        const end = textArea.textLength;
        const word = textArea.value.substring(start, end);
        const suggestions = getSuggestions(word, props.functions);
        setSuggestions(suggestions);
        setSelectedSuggestions(suggestions[0] ?? null);
    };

    const onKeyDown = (event: any) => {
        if (event.key == "Tab") {
            event.preventDefault();
            if (selectedSuggestion == null) return;

            const textArea = event.target as HTMLTextAreaElement;

            const appendableString = selectedSuggestion.name.substring(
                textArea.value.length - findStartOfLastWord(textArea.value),
            );
            textArea.value = textArea.value + appendableString;
            setSuggestions([]);
        }
    };

    const onClick = (event: any) => {
        if (suggestions.length == 0) {
            return;
        }
        const suggestion = event.target.innerText;
        const textArea = document.getElementById("textarea") as HTMLTextAreaElement;
        const appendableString = suggestion.substring(textArea.value.length - findStartOfLastWord(textArea.value));
        textArea.value = textArea.value + appendableString;
        setSuggestions([]);
    };

    return (
        <div className="h-screen w-full p-8">
            <div className={robotoMono.className}>
                <textarea
                    id="textarea"
                    spellCheck={false}
                    className="bg-zinc-900 w-full text-white h-96 caret-white pl-2 pr-2 pt-1 pb-1 resize-none outline-none m-0 border-r-0"
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
                {suggestions.length > 0 ? (
                    <ul className="top-full mt-1 py-1 px-2 bg-zinc-700">
                        {suggestions.map((suggestion) =>
                            suggestion.name == selectedSuggestion?.name ? (
                                <li
                                    key={suggestion.name}
                                    className="cursor-pointer py-1 px-2 hover:bg-zinc-800 text-amber-300"
                                    onClick={onClick}
                                >
                                    {suggestion.name}
                                </li>
                            ) : (
                                <li
                                    key={suggestion.name}
                                    className="cursor-pointer py-1 px-2 hover:bg-zinc-800"
                                    onClick={onClick}
                                    onMouseEnter={() => setSelectedSuggestions(suggestion)}
                                >
                                    {suggestion.name}
                                </li>
                            ),
                        )}
                    </ul>
                ) : (
                    <span></span>
                )}
            </div>
        </div>
    );
}

function findStartOfLastWord(text: string) {
    if (!text.includes(" ")) {
        return 0;
    }

    let i = text.length - 1;
    while (i >= 0 && text[i] != " ") {
        i--;
    }
    return i + 1;
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
