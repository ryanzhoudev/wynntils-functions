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

/**
 * Returns the index of the first character of the word the caret is currently in.
 * Separators are not considered part of the word.
 * @param text The text to search in.
 * @param caretPosition The position of the caret. 0-indexed. The leftmost and rightmost positions are 0 and text.length, respectively.
 * @param skipSets The number of sets of separators to skip. For example, if skipSets is 1 and separators is [" "], then this function will skip over one space and stop at the next space.
 * @param separators The characters that separate words.
 * @return The index of the first character of the word the caret is currently in. Characters are 0-indexed, so the leftmost and rightmost characters are 0 and text.length - 1, respectively.
 */
export function getStartIndexOfCurrentWord(
    text: string,
    caretPosition: number,
    skipSets: number,
    separators: string[],
) {
    let i = caretPosition - 1;
    while (i >= 0) {
        if (separators.includes(text[i])) {
            if (skipSets > 0) {
                skipSets--;
            } else {
                return i + 1;
            }
        }
        i--;
    }
    return 0;
}

/**
 * Returns the index of the last character of the word the caret is currently in.
 * Caret positions are essentially 0-indexed.
 * Separators are not considered part of the word.
 * @param text The text to search in.
 * @param caretPosition The position of the caret. 0-indexed. The leftmost and rightmost positions are 0 and text.length, respectively.
 * @param skipSets The number of sets of separators to skip. For example, if skipSets is 1 and separators is [" "], then this function will skip over one space and stop at the next space.
 * @param separators The characters that separate words.
 * @return The index of the last character of the word the caret is currently in. Characters are 0-indexed, so the leftmost and rightmost characters are 0 and text.length - 1, respectively.
 */
export function getEndIndexOfCurrentWord(text: string, caretPosition: number, skipSets: number, separators: string[]) {
    let i = caretPosition;
    while (i < text.length) {
        if (separators.includes(text[i])) {
            if (skipSets > 0) {
                skipSets--;
            } else {
                return i - 1 < 0 ? 0 : i - 1; // dollar store Math.clamp because this terrible language does not have it
                // returns i-1 unless i-1 is less than 0, in which case it returns 0
            }
        }
        i++;
    }
    return text.length;
}

export const Separators = Object.freeze({
    SPACES: [" "],
    PARENTHESES: ["(", ")"],
    QUOTES: ['"'],
    SEMICOLONS: [";"],
});

/**
 * Returns the index of the matching parentheses for the given caret position. Returns -1 if no matching parentheses is found.
 */
export function getMatchingParenthesesIndex(text: string, caretPosition: number) {
    if (text[caretPosition] != "(" && text[caretPosition] != ")") {
        return -1;
    }
    let openParentheses = 0;
    let i = caretPosition;
    while (true) {
        if (text[i] == "(") {
            openParentheses++;
        } else if (text[i] == ")") {
            openParentheses--;
        }

        if (openParentheses == 0) {
            return i;
        } else if (openParentheses < 0) {
            // we need to move left
            i--;
        } else if (openParentheses > 0) {
            // we need to move right
            i++;
        }

        if (i >= text.length || i < 0) {
            return -1;
        }
    }
}
