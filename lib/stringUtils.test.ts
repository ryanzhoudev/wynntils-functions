import {
    getTextInCurrentParentheses,
    getStartIndexOfCurrentWord,
    getEndIndexOfCurrentWord,
    Separators,
    getMatchingParenthesesIndex,
} from "./stringUtils";
import { expect } from "@jest/globals";

test("getTextInCurrentParentheses", () => {
    expect(getTextInCurrentParentheses("()", 1)).toBe("()");
    expect(getTextInCurrentParentheses("(())", 2)).toBe("()");
    expect(getTextInCurrentParentheses("((((((((", 0)).toBe("((((((((");
    expect(getTextInCurrentParentheses("((((((((", 7)).toBe("(");
    expect(getTextInCurrentParentheses("))))))))", 0)).toBe(")");
    expect(getTextInCurrentParentheses("))))))))", 7)).toBe("))))))))");
    expect(getTextInCurrentParentheses("(this is some text)", 3)).toBe("(this is some text)");
    expect(getTextInCurrentParentheses("(this is some text)", 0)).toBe("(this is some text)");
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 0)).toBe(
        "(more ( complex text ( with )) lots of brackets)",
    );
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 21)).toBe("( with )");
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 22)).toBe("( with )");
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 8)).toBe(
        "( complex text ( with ))",
    );
    expect(getTextInCurrentParentheses("(mismatched parens", 0)).toBe("(mismatched parens");
    expect(getTextInCurrentParentheses("mismatched parens)", 0)).toBe("mismatched parens)");
});

test("getStartIndexOfCurrentWord", () => {
    expect(getStartIndexOfCurrentWord("this is some text", 0, 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 3, 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 4, 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 5, 0, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 6, 0, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 7, 0, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 16, 0, Separators.PARENTHESES)).toBe(0);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 17, 0, Separators.PARENTHESES)).toBe(17);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 23, 0, Separators.PARENTHESES)).toBe(17);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 24, 0, Separators.PARENTHESES)).toBe(24);
    expect(getStartIndexOfCurrentWord(" starting with space", 0, 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord(" starting with space", 1, 0, Separators.SPACES)).toBe(1);
    expect(getStartIndexOfCurrentWord("ending with space ", 17, 0, Separators.SPACES)).toBe(12);
    expect(getStartIndexOfCurrentWord("ending with space ", 18, 0, Separators.SPACES)).toBe(18);
    expect(getStartIndexOfCurrentWord('function(")', 9, 0, Separators.PARENTHESES)).toBe(9);
    expect(getStartIndexOfCurrentWord('function(")', 10, 0, Separators.PARENTHESES)).toBe(9);
});

test("getEndIndexOfCurrentWord", () => {
    expect(getEndIndexOfCurrentWord("this is some text", 0, 0, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 3, 0, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 4, 0, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 5, 0, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 6, 0, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 7, 0, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 16, 0, Separators.PARENTHESES)).toBe(15);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 17, 0, Separators.PARENTHESES)).toBe(22);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 23, 0, Separators.PARENTHESES)).toBe(22);
    expect(getEndIndexOfCurrentWord(" starting with space", 0, 0, Separators.SPACES)).toBe(0);
    expect(getEndIndexOfCurrentWord(" starting with space", 1, 0, Separators.SPACES)).toBe(8);
    expect(getEndIndexOfCurrentWord("ending with space ", 17, 0, Separators.SPACES)).toBe(16);
    expect(getEndIndexOfCurrentWord("ending with space ", 18, 0, Separators.SPACES)).toBe(18);
});

test("getMatchingParenthesesIndex", () => {
    expect(getMatchingParenthesesIndex("()", 0)).toBe(1);
    expect(getMatchingParenthesesIndex("()", 1)).toBe(0);
    expect(getMatchingParenthesesIndex("(())", 0)).toBe(3);
    expect(getMatchingParenthesesIndex("(())", 1)).toBe(2);
    expect(getMatchingParenthesesIndex("(())", 2)).toBe(1);
    expect(getMatchingParenthesesIndex("(())", 3)).toBe(0);
    expect(getMatchingParenthesesIndex("((((((((", 0)).toBe(-1);
    expect(getMatchingParenthesesIndex("((((((((", 7)).toBe(-1);
    expect(getMatchingParenthesesIndex("))))))))", 0)).toBe(-1);
    expect(getMatchingParenthesesIndex("))))))))", 7)).toBe(-1);
    expect(getMatchingParenthesesIndex("(this is some text)", 0)).toBe(18);
    expect(getMatchingParenthesesIndex("(this is some text)", 3)).toBe(-1);
    expect(getMatchingParenthesesIndex("(this is some text)", 18)).toBe(0);
});
