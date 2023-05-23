"use client";

import { Roboto_Mono } from "next/font/google";
import { useState } from "react";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default function IdeTextarea(props: any) {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const onChange = (event: any) => {
        const textArea = event.target as HTMLTextAreaElement;
        const start = findStartOfLastWord(textArea.value);
        const end = textArea.textLength;
        console.log("start: " + start + " end: " + end);
        const word = textArea.value.substring(start, end);
        const suggestions = getSuggestions(word, props.functionNames);
        setSuggestions(suggestions);
    };

    const onKeyDown = (event: any) => {
        if (event.key == "Tab") {
            event.preventDefault();
            if (suggestions.length == 0) {
                return;
            }
            const textArea = event.target as HTMLTextAreaElement;
            const appendableString = suggestions[0].substring(
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
        const textArea = document.getElementById("textarea") as HTMLTextAreaElement;
        const appendableString = suggestions[0].substring(textArea.value.length - findStartOfLastWord(textArea.value));
        textArea.value = textArea.value + appendableString;
        setSuggestions([]);
    };

    return (
        <div className="h-screen w-full">
            <div className={robotoMono.className}>
                <textarea
                    id="textarea"
                    className="bg-gray-800 text-white w-full h-5/6"
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
                <ul className="top-full mt-1 py-1 px-2 bg-zinc-700">
                    <li
                        key={suggestions[0]}
                        className="cursor-pointer py-1 px-2 hover:bg-gray-800 text-amber-300"
                        onClick={onClick}
                    >
                        {suggestions[0]}
                    </li>
                    {suggestions.slice(1).map((suggestion) => (
                        <li key={suggestion} className="cursor-pointer py-1 px-2 hover:bg-zinc-800" onClick={onClick}>
                            {suggestion}
                        </li>
                    ))}
                </ul>
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

function getSuggestions(word: string, functionNames: string[]): string[] {
    if (functionNames.length == 0 || word == "") {
        console.log("returning empty and word is " + word);
        return [];
    }
    const returnable: string[] = [];
    for (const name of functionNames) {
        if (name.startsWith(word)) {
            returnable.push(name);
        }
    }
    console.log("returning: " + returnable);
    return returnable;
}
