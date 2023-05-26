import { getTextInCurrentParentheses, getStartOfCurrentWord, getEndOfCurrentWord, getSuggestions } from "./stringUtils";
import { expect } from "@jest/globals";

test("getTextInCurrentParentheses", () => {
    expect(getTextInCurrentParentheses("()", 1)).toBe("()");
    expect(getTextInCurrentParentheses("(())", 2)).toBe("()");
    expect(getTextInCurrentParentheses("(this is some text)", 3)).toBe("(this is some text)");
    expect(getTextInCurrentParentheses("(this is some text)", 0)).toBe("(this is some text)");
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 0)).toBe(
        "(more ( complex text ( with )) lots of brackets)",
    );
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 21)).toBe("( with )");
    expect(getTextInCurrentParentheses("(more ( complex text ( with )) lots of brackets)", 22)).toBe("( with )");
    expect(getTextInCurrentParentheses("(mismatched parens", 0)).toBe("(mismatched parens");
    expect(getTextInCurrentParentheses("mismatched parens)", 0)).toBe("mismatched parens)");
});
