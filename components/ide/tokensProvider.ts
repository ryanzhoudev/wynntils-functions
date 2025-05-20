import * as monaco from "monaco-editor";
import WynntilsLexer from "@/lib/antlr/WynntilsLexer.ts";
import antlr4 from "antlr4";

export default function tokensProvider(): TokensProvider {
    return new TokensProvider();
}

class State implements monaco.languages.IState {
    clone(): monaco.languages.IState {
        return new State();
    }
    equals(other: monaco.languages.IState): boolean {
        // can always be true for our example
        return true;
    }
}

class TokensProvider implements monaco.languages.TokensProvider {
    getInitialState(): monaco.languages.IState {
        return new State();
    }
    tokenize(line: string): monaco.languages.ILineTokens {
        // So far we ignore the state, which may harm performance for massive texts
        return tokensForLine(line);
    }
}

function tokensForLine(input: string): monaco.languages.ILineTokens {
    // Using our created tokenize functionality to cut tokens and map them to monaco tokens
    const tokens = tokenize(input);
    return new LineTokens(
        tokens.map((token) => new Token(WynntilsLexer.symbolicNames[token.type] || "UNKNOWN", token.start, token.stop)),
    );
}

function tokenize(input: string): antlr4.Token[] {
    const chars = new antlr4.CharStream(input);
    const lexer = new WynntilsLexer(chars);
    return lexer.getAllTokens();
}

class LineTokens implements monaco.languages.ILineTokens {
    endState: monaco.languages.IState;
    tokens: monaco.languages.IToken[];
    constructor(tokens: monaco.languages.IToken[]) {
        this.endState = new State();
        this.tokens = tokens;
    }
}

class Token implements monaco.languages.IToken {
    scopes: string;
    startIndex: number;
    endIndex: number;
    constructor(ruleName: string, startIndex: number, endIndex: number) {
        // important: the ruleName must match your theme definition
        this.scopes = ruleName;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
    }
}
