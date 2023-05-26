import { getTextInCurrentParentheses, getStartIndexOfCurrentWord, getEndIndexOfCurrentWord } from "./stringUtils";
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
    expect(getStartIndexOfCurrentWord("this is some text", 0)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 3)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 4)).toBe(0);
    expect(getStartIndexOfCurrentWord("this is some text", 5)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 6)).toBe(5);
    expect(getStartIndexOfCurrentWord("this is some text", 7)).toBe(5);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 16)).toBe(0);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 17)).toBe(17);
    expect(getStartIndexOfCurrentWord("function_example(param1)", 23)).toBe(17);
});

test("getEndIndexOfCurrentWord", () => {
    expect(getEndIndexOfCurrentWord("this is some text", 0)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 3)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 4)).toBe(3);
    expect(getEndIndexOfCurrentWord("this is some text", 5)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 6)).toBe(6);
    expect(getEndIndexOfCurrentWord("this is some text", 7)).toBe(6);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 16)).toBe(15);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 17)).toBe(22);
    expect(getEndIndexOfCurrentWord("function_example(param1)", 23)).toBe(22);
});
