import { Function } from ".prisma/client";

/**
 * Should be called when the caret is inside some parentheses.
 * Returns the text between the closest left and right parentheses, including the parentheses.
 * If the parentheses are not balanced, the returned text will extend to the start/end of the string.
 * @param text The text to search in.
 * @param characterIndex The index of the character from which to "branch out" the search. 0-indexed.
 * If the character at this index is a paranthesis, it will be taken as the "current" parenthesis.
 */
export function getTextInCurrentParentheses(text: string, characterIndex: number) {
    let start: number = 0;
    let end: number = text.length - 1;

    // iterate left to find the start of the parentheses
    let i = characterIndex;
    let openParentheses = text[i] == ")" ? 0 : 1;
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
        if (i < 0) {
            start = 0;
            break;
        }
    }

    // iterate right to find the end of the parentheses
    i = characterIndex;
    openParentheses = text[i] == "(" ? 0 : 1;
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
        if (i >= text.length) {
            end = text.length - 1;
            break;
        }
    }
    return text.substring(start, end + 1);
}

export function getStartOfCurrentWord(text: string, caretPosition: number) {
    if (!text.includes(" ")) {
        return 0;
    }

    let i = caretPosition - 1;
    while (i >= 0 && text[i] != " ") {
        i--;
    }
    return i + 1;
}

export function getEndOfCurrentWord(text: string, caretPosition: number) {
    if (!text.includes(" ")) {
        return text.length;
    }

    let i = caretPosition;
    while (i < text.length && text[i] != " ") {
        i++;
    }
    return i;
}

export function getSuggestions(word: string, functions: Function[]): Function[] {
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
