import {
    getTextInCurrentParentheses,
    getStartIndexOfCurrentWord,
    getEndIndexOfCurrentWord,
    Separators,
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
    expect(getStartIndexOfCurrentWord("this is some text", 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 3, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 4, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 5, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 6, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 7, Separators.SPACES)).toBe(5);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 16, Separators.PARENTHESES)).toBe(0);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 17, Separators.PARENTHESES)).toBe(17);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 23, Separators.PARENTHESES)).toBe(17);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 24, Separators.PARENTHESES)).toBe(24);
    expect(getStartIndexOfCurrentWord(" starting with space", 0, Separators.SPACES)).toBe(0);
    expect(getStartIndexOfCurrentWord(" starting with space", 1, Separators.SPACES)).toBe(1);
    expect(getStartIndexOfCurrentWord("ending with space ", 17, Separators.SPACES)).toBe(12);
    expect(getStartIndexOfCurrentWord("ending with space ", 18, Separators.SPACES)).toBe(18);
});

test("getEndIndexOfCurrentWord", () => {
    expect(getEndIndexOfCurrentWord("this is some text", 0, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 3, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 4, Separators.SPACES)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 5, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 6, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 7, Separators.SPACES)).toBe(6);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 16, Separators.PARENTHESES)).toBe(15);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 17, Separators.PARENTHESES)).toBe(22);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 23, Separators.PARENTHESES)).toBe(22);
    expect(getEndIndexOfCurrentWord(" starting with space", 0, Separators.SPACES)).toBe(0);
    expect(getEndIndexOfCurrentWord(" starting with space", 1, Separators.SPACES)).toBe(8);
    expect(getEndIndexOfCurrentWord("ending with space ", 17, Separators.SPACES)).toBe(16);
    expect(getEndIndexOfCurrentWord("ending with space ", 18, Separators.SPACES)).toBe(18);
});
