// Generated from lib/Wynntils.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import WynntilsListener from "./WynntilsListener.js";
import WynntilsVisitor from "./WynntilsVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class WynntilsParser extends Parser {
	public static readonly LCURLY = 1;
	public static readonly RCURLY = 2;
	public static readonly LPAREN = 3;
	public static readonly RPAREN = 4;
	public static readonly SEMI = 5;
	public static readonly BOOLEAN = 6;
	public static readonly STRING = 7;
	public static readonly NUMBER = 8;
	public static readonly IDENTIFIER = 9;
	public static readonly WS = 10;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_script = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_functionCall = 2;
	public static readonly RULE_argList = 3;
	public static readonly RULE_literal = 4;
	public static readonly literalNames: (string | null)[] = [ null, "'{'", 
                                                            "'}'", "'('", 
                                                            "')'", "';'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "LCURLY", 
                                                             "RCURLY", "LPAREN", 
                                                             "RPAREN", "SEMI", 
                                                             "BOOLEAN", 
                                                             "STRING", "NUMBER", 
                                                             "IDENTIFIER", 
                                                             "WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"script", "expression", "functionCall", "argList", "literal",
	];
	public get grammarFileName(): string { return "Wynntils.g4"; }
	public get literalNames(): (string | null)[] { return WynntilsParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return WynntilsParser.symbolicNames; }
	public get ruleNames(): string[] { return WynntilsParser.ruleNames; }
	public get serializedATN(): number[] { return WynntilsParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, WynntilsParser._ATN, WynntilsParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public script(): ScriptContext {
		let localctx: ScriptContext = new ScriptContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, WynntilsParser.RULE_script);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 10;
			this.match(WynntilsParser.LCURLY);
			this.state = 11;
			this.expression();
			this.state = 12;
			this.match(WynntilsParser.RCURLY);
			this.state = 13;
			this.match(WynntilsParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression(): ExpressionContext {
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, WynntilsParser.RULE_expression);
		try {
			this.state = 18;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 0, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 15;
				this.functionCall();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 16;
				this.match(WynntilsParser.STRING);
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 17;
				this.literal();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public functionCall(): FunctionCallContext {
		let localctx: FunctionCallContext = new FunctionCallContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, WynntilsParser.RULE_functionCall);
		let _la: number;
		try {
			this.state = 27;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
			case 1:
				localctx = new NoArgsFunctionContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 20;
				this.match(WynntilsParser.IDENTIFIER);
				}
				break;
			case 2:
				localctx = new ParenFunctionContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 21;
				this.match(WynntilsParser.IDENTIFIER);
				this.state = 22;
				this.match(WynntilsParser.LPAREN);
				this.state = 24;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 960) !== 0)) {
					{
					this.state = 23;
					this.argList();
					}
				}

				this.state = 26;
				this.match(WynntilsParser.RPAREN);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public argList(): ArgListContext {
		let localctx: ArgListContext = new ArgListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, WynntilsParser.RULE_argList);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 29;
			this.expression();
			this.state = 34;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===5) {
				{
				{
				this.state = 30;
				this.match(WynntilsParser.SEMI);
				this.state = 31;
				this.expression();
				}
				}
				this.state = 36;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public literal(): LiteralContext {
		let localctx: LiteralContext = new LiteralContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, WynntilsParser.RULE_literal);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 37;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 448) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,10,40,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,3,1,19,8,
	1,1,2,1,2,1,2,1,2,3,2,25,8,2,1,2,3,2,28,8,2,1,3,1,3,1,3,5,3,33,8,3,10,3,
	12,3,36,9,3,1,4,1,4,1,4,0,0,5,0,2,4,6,8,0,1,1,0,6,8,39,0,10,1,0,0,0,2,18,
	1,0,0,0,4,27,1,0,0,0,6,29,1,0,0,0,8,37,1,0,0,0,10,11,5,1,0,0,11,12,3,2,
	1,0,12,13,5,2,0,0,13,14,5,0,0,1,14,1,1,0,0,0,15,19,3,4,2,0,16,19,5,7,0,
	0,17,19,3,8,4,0,18,15,1,0,0,0,18,16,1,0,0,0,18,17,1,0,0,0,19,3,1,0,0,0,
	20,28,5,9,0,0,21,22,5,9,0,0,22,24,5,3,0,0,23,25,3,6,3,0,24,23,1,0,0,0,24,
	25,1,0,0,0,25,26,1,0,0,0,26,28,5,4,0,0,27,20,1,0,0,0,27,21,1,0,0,0,28,5,
	1,0,0,0,29,34,3,2,1,0,30,31,5,5,0,0,31,33,3,2,1,0,32,30,1,0,0,0,33,36,1,
	0,0,0,34,32,1,0,0,0,34,35,1,0,0,0,35,7,1,0,0,0,36,34,1,0,0,0,37,38,7,0,
	0,0,38,9,1,0,0,0,4,18,24,27,34];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!WynntilsParser.__ATN) {
			WynntilsParser.__ATN = new ATNDeserializer().deserialize(WynntilsParser._serializedATN);
		}

		return WynntilsParser.__ATN;
	}


	static DecisionsToDFA = WynntilsParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class ScriptContext extends ParserRuleContext {
	constructor(parser?: WynntilsParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LCURLY(): TerminalNode {
		return this.getToken(WynntilsParser.LCURLY, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RCURLY(): TerminalNode {
		return this.getToken(WynntilsParser.RCURLY, 0);
	}
	public EOF(): TerminalNode {
		return this.getToken(WynntilsParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return WynntilsParser.RULE_script;
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterScript) {
	 		listener.enterScript(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitScript) {
	 		listener.exitScript(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitScript) {
			return visitor.visitScript(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: WynntilsParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public functionCall(): FunctionCallContext {
		return this.getTypedRuleContext(FunctionCallContext, 0) as FunctionCallContext;
	}
	public STRING(): TerminalNode {
		return this.getToken(WynntilsParser.STRING, 0);
	}
	public literal(): LiteralContext {
		return this.getTypedRuleContext(LiteralContext, 0) as LiteralContext;
	}
    public get ruleIndex(): number {
    	return WynntilsParser.RULE_expression;
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterExpression) {
	 		listener.enterExpression(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitExpression) {
	 		listener.exitExpression(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitExpression) {
			return visitor.visitExpression(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FunctionCallContext extends ParserRuleContext {
	constructor(parser?: WynntilsParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return WynntilsParser.RULE_functionCall;
	}
	public override copyFrom(ctx: FunctionCallContext): void {
		super.copyFrom(ctx);
	}
}
export class ParenFunctionContext extends FunctionCallContext {
	constructor(parser: WynntilsParser, ctx: FunctionCallContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(WynntilsParser.IDENTIFIER, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(WynntilsParser.LPAREN, 0);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(WynntilsParser.RPAREN, 0);
	}
	public argList(): ArgListContext {
		return this.getTypedRuleContext(ArgListContext, 0) as ArgListContext;
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterParenFunction) {
	 		listener.enterParenFunction(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitParenFunction) {
	 		listener.exitParenFunction(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitParenFunction) {
			return visitor.visitParenFunction(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class NoArgsFunctionContext extends FunctionCallContext {
	constructor(parser: WynntilsParser, ctx: FunctionCallContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(WynntilsParser.IDENTIFIER, 0);
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterNoArgsFunction) {
	 		listener.enterNoArgsFunction(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitNoArgsFunction) {
	 		listener.exitNoArgsFunction(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitNoArgsFunction) {
			return visitor.visitNoArgsFunction(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ArgListContext extends ParserRuleContext {
	constructor(parser?: WynntilsParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public SEMI_list(): TerminalNode[] {
	    	return this.getTokens(WynntilsParser.SEMI);
	}
	public SEMI(i: number): TerminalNode {
		return this.getToken(WynntilsParser.SEMI, i);
	}
    public get ruleIndex(): number {
    	return WynntilsParser.RULE_argList;
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterArgList) {
	 		listener.enterArgList(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitArgList) {
	 		listener.exitArgList(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitArgList) {
			return visitor.visitArgList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class LiteralContext extends ParserRuleContext {
	constructor(parser?: WynntilsParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public BOOLEAN(): TerminalNode {
		return this.getToken(WynntilsParser.BOOLEAN, 0);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(WynntilsParser.NUMBER, 0);
	}
	public STRING(): TerminalNode {
		return this.getToken(WynntilsParser.STRING, 0);
	}
    public get ruleIndex(): number {
    	return WynntilsParser.RULE_literal;
	}
	public enterRule(listener: WynntilsListener): void {
	    if(listener.enterLiteral) {
	 		listener.enterLiteral(this);
		}
	}
	public exitRule(listener: WynntilsListener): void {
	    if(listener.exitLiteral) {
	 		listener.exitLiteral(this);
		}
	}
	// @Override
	public accept<Result>(visitor: WynntilsVisitor<Result>): Result {
		if (visitor.visitLiteral) {
			return visitor.visitLiteral(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
