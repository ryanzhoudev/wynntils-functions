export enum TokenKind {
  LeftBrace = "LeftBrace",
  RightBrace = "RightBrace",
  LeftParenthesis = "LeftParenthesis",
  RightParenthesis = "RightParenthesis",
  Semicolon = "Semicolon",
  Identifier = "Identifier",
  StringLiteral = "StringLiteral",
  Number = "Number",
  Boolean = "Boolean",
  HexLiteral = "HexLiteral",
  Placeholder = "Placeholder"
}

export interface StructuralToken {
  kind: TokenKind.LeftBrace | TokenKind.RightBrace | TokenKind.LeftParenthesis | TokenKind.RightParenthesis | TokenKind.Semicolon;
  offset: number;
  length: number;
}

export interface ValueToken {
  kind: Exclude<TokenKind, StructuralToken["kind"]>;
  value: string;
  offset: number;
  length: number;
}

export type Token = StructuralToken | ValueToken;

export function isValueToken(token: Token): token is ValueToken {
  return "value" in token;
}

const singleCharacterTokens: Record<string, StructuralToken["kind"]> = {
  "{": TokenKind.LeftBrace,
  "}": TokenKind.RightBrace,
  "(": TokenKind.LeftParenthesis,
  ")": TokenKind.RightParenthesis,
  ";": TokenKind.Semicolon
};

const whitespaceExpression = /\s/;
const numericStarterExpression = /[0-9\-]/;
const numericBodyExpression = /[0-9.]/;
const identifierStarterExpression = /[A-Za-z_]/;
const identifierBodyExpression = /[A-Za-z0-9_]/;
const hexadecimalExpression = /[0-9a-fA-F]/;

export function lex(sourceText: string): Token[] {
  const tokens: Token[] = [];
  const length = sourceText.length;
  let index = 0;

  const addStructuralToken = (kind: StructuralToken["kind"], startOffset: number, endOffset: number) => {
    tokens.push({ kind, offset: startOffset, length: endOffset - startOffset });
  };

  const addValueToken = (kind: ValueToken["kind"], value: string, startOffset: number, endOffset: number) => {
    tokens.push({ kind, value, offset: startOffset, length: endOffset - startOffset });
  };

  while (index < length) {
    const currentCharacter = sourceText[index];

    // Skip line comments.
    if (currentCharacter === "/" && sourceText[index + 1] === "/") {
      while (index < length && sourceText[index] !== "\n") {
        index++;
      }
      continue;
    }

    // Skip whitespace.
    if (whitespaceExpression.test(currentCharacter)) {
      index++;
      continue;
    }

    const tokenStart = index;

    // Structural tokens such as braces and parentheses.
    const structuralKind = singleCharacterTokens[currentCharacter];
    if (structuralKind) {
      index++;
      addStructuralToken(structuralKind, tokenStart, index);
      continue;
    }

    // String literals: consume until the next unescaped quote.
    if (currentCharacter === "\"") {
      index++; // Skip the opening quote.
      let stringValue = "";

      while (index < length && sourceText[index] !== "\"") {
        if (sourceText[index] === "\\" && index + 1 < length) {
          stringValue += sourceText[index + 1];
          index += 2;
        } else {
          stringValue += sourceText[index];
          index++;
        }
      }

      if (index < length) {
        index++; // Consume closing quote if present.
      }

      addValueToken(TokenKind.StringLiteral, stringValue, tokenStart, index);
      continue;
    }

    // Hex literals beginning with '#'.
    if (currentCharacter === "#") {
      index++;
      let hexValue = "#";
      while (index < length && hexadecimalExpression.test(sourceText[index])) {
        hexValue += sourceText[index];
        index++;
      }
      addValueToken(TokenKind.HexLiteral, hexValue, tokenStart, index);
      continue;
    }

    // Placeholders of the form ${identifier} or @{identifier}.
    if ((currentCharacter === "$" || currentCharacter === "@") && sourceText[index + 1] === "{") {
      index += 2; // Skip '${' or '@{'.
      let placeholderName = "";
      while (index < length && sourceText[index] !== "}") {
        placeholderName += sourceText[index];
        index++;
      }
      if (sourceText[index] === "}") {
        index++; // Consume closing brace.
      }
      addValueToken(TokenKind.Placeholder, placeholderName, tokenStart, index);
      continue;
    }

    // Numeric literals (including negatives and decimals).
    if (numericStarterExpression.test(currentCharacter)) {
      let numericValue = "";
      while (index < length && numericBodyExpression.test(sourceText[index])) {
        numericValue += sourceText[index];
        index++;
      }
      addValueToken(TokenKind.Number, numericValue, tokenStart, index);
      continue;
    }

    // Identifiers and keywords (true/false).
    if (identifierStarterExpression.test(currentCharacter)) {
      let identifier = "";
      while (index < length && identifierBodyExpression.test(sourceText[index])) {
        identifier += sourceText[index];
        index++;
      }
      const kind = identifier === "true" || identifier === "false" ? TokenKind.Boolean : TokenKind.Identifier;
      addValueToken(kind, identifier, tokenStart, index);
      continue;
    }

    // Fallback: advance to avoid an infinite loop.
    index++;
  }

  return tokens;
}
