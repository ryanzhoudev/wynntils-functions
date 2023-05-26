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

const wordSeparators = [" ", "(", ")"];

/**
 * Returns the index of the first character of the word the caret is currently in. Word separators are " ", "(" and ")".
 * Separators are not included in the returned index. If the characterIndex is a separator, the index of the previous word is returned.
 */
export function getStartIndexOfCurrentWord(text: string, characterIndex: number) {
    let i = characterIndex - 1;
    while (i >= 0 && !wordSeparators.includes(text[i])) {
        i--;
    }
    return i + 1;
}

export function getEndIndexOfCurrentWord(text: string, characterIndex: number) {
    if (!text.includes(" ")) {
        return text.length;
    }

    let i = characterIndex;
    while (i < text.length && text[i] != " ") {
        i++;
    }
    return i;
}
