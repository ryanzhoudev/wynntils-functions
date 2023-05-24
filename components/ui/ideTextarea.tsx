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

    const onChange = (event: any) => {
        const textArea = event.target as HTMLTextAreaElement;
        const start = findStartOfLastWord(textArea.value);
        const end = textArea.textLength;
        const word = textArea.value.substring(start, end);
        const suggestions = getSuggestions(word, props.functions);
        setSuggestions(suggestions);
    };

    const onKeyDown = (event: any) => {
        if (event.key == "Tab") {
            event.preventDefault();
            if (suggestions.length == 0) {
                return;
            }
            const textArea = event.target as HTMLTextAreaElement;
            const appendableString = suggestions[0].name.substring(
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
                    className="bg-zinc-900 w-full text-white h-96 caret-white p-2 resize-none outline-none"
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
                {suggestions.length > 0 ? (
                    <ul className="top-full mt-1 py-1 px-2 bg-zinc-700">
                        <li
                            key={suggestions[0].name}
                            className="cursor-pointer py-1 px-2 hover:bg-gray-800 text-amber-300"
                            onClick={onClick}
                        >
                            {suggestions[0].name}
                        </li>
                        {suggestions.slice(1).map((suggestion) => (
                            <li
                                key={suggestion.name}
                                className="cursor-pointer py-1 px-2 hover:bg-zinc-800"
                                onClick={onClick}
                            >
                                {suggestion.name}
                            </li>
                        ))}
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
