"use client";

import { Roboto_Mono } from "next/font/google";

const robotoMono = Roboto_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default function IdeTextarea(props: any) {
    const handleKeyDown = (event: any) => {
        if (event.key == "Tab") {
            event.preventDefault();
            const textArea = event.target as HTMLTextAreaElement;
            const start = findStartOfLastWord(textArea.value);
            const end = textArea.textLength;
            const word = textArea.value.substring(start, end);
            const suggestions = getSuggestions(word, props.functionNames);
            console.log(suggestions);
        }
    };

    return (
        <div className={robotoMono.className}>
            <textarea className="bg-gray-800 text-white w-full h-screen" onKeyDown={handleKeyDown} />
        </div>
    );
}

function findStartOfLastWord(text: string) {
    let i = text.length - 1;
    while (i >= 0 && text[i] != " ") {
        i--;
    }
    return i + 1;
}

function getSuggestions(word: string, functionNames: string[]): string[] {
    if (functionNames.length == 0) {
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
