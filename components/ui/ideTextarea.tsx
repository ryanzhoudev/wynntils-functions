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
            const start = textArea.selectionStart;
            const end = textArea.selectionEnd;
            const text = textArea.value;
            const word = text.substring(start, end);
            const suggestions = getSuggestions(word, props.functionNames);
            if (suggestions.length == 1) {
                textArea.value = text.substring(0, start) + suggestions[0] + text.substring(end);
                textArea.selectionStart = start + suggestions[0].length;
                textArea.selectionEnd = start + suggestions[0].length;
            }
        }
    };

    return (
        <div className={robotoMono.className}>
            <textarea className="bg-gray-800 text-white w-full h-screen" onKeyDown={handleKeyDown} />
        </div>
    );
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
