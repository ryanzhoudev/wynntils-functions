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
 * Caret positions are essentially 0-indexed. The leftmost position of the caret (where the caret is to the left of the first character) is 0.
 * The rightmost position of the caret (where the caret is to the right of the last character) is text.length.
 * Separators are not considered part of the word.
 * @return The index of the first character of the word the caret is currently in. Characters are also 0-indexed, but, unlike caret positions, the first character is at index 0.
 */
export function getStartIndexOfCurrentWord(text: string, caretPosition: number, separateOnParentheses: boolean) {
    const wordSeparators = separateOnParentheses ? [" ", "(", ")"] : [" "];
    let i = caretPosition - 1;
    while (i >= 0) {
        if (wordSeparators.includes(text[i])) {
            return i + 1;
        }
        i--;
    }
    return 0;
}

/**
 * Returns the index of the last character of the word the caret is currently in.
 * Caret positions are essentially 0-indexed. The leftmost position of the caret (where the caret is to the left of the first character) is 0.
 * The rightmost position of the caret (where the caret is to the right of the last character) is text.length.
 * Separators are not considered part of the word.
 * @return The index of the last character of the word the caret is currently in. Characters are also 0-indexed, but, unlike caret positions, the first character is at index 0.
 */
export function getEndIndexOfCurrentWord(text: string, caretPosition: number, separateOnParentheses: boolean) {
    const wordSeparators = separateOnParentheses ? [" ", "(", ")"] : [" "];
    let i = caretPosition;
    while (i < text.length) {
        if (wordSeparators.includes(text[i])) {
            return i - 1 < 0 ? 0 : i - 1; // dollar store Math.clamp because this terrible language does not have it
            // returns i-1 unless i-1 is less than 0, in which case it returns 0
        }
        i++;
    }
    return text.length;
}
