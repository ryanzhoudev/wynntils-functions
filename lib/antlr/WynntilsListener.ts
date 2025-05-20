// Generated from lib/Wynntils.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


import { ScriptContext } from "./WynntilsParser.js";
import { ExpressionContext } from "./WynntilsParser.js";
import { NoArgsFunctionContext } from "./WynntilsParser.js";
import { ParenFunctionContext } from "./WynntilsParser.js";
import { ArgListContext } from "./WynntilsParser.js";
import { LiteralContext } from "./WynntilsParser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `WynntilsParser`.
 */
export default class WynntilsListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `WynntilsParser.script`.
	 * @param ctx the parse tree
	 */
	enterScript?: (ctx: ScriptContext) => void;
	/**
	 * Exit a parse tree produced by `WynntilsParser.script`.
	 * @param ctx the parse tree
	 */
	exitScript?: (ctx: ScriptContext) => void;
	/**
	 * Enter a parse tree produced by `WynntilsParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `WynntilsParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Enter a parse tree produced by the `NoArgsFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 */
	enterNoArgsFunction?: (ctx: NoArgsFunctionContext) => void;
	/**
	 * Exit a parse tree produced by the `NoArgsFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 */
	exitNoArgsFunction?: (ctx: NoArgsFunctionContext) => void;
	/**
	 * Enter a parse tree produced by the `ParenFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 */
	enterParenFunction?: (ctx: ParenFunctionContext) => void;
	/**
	 * Exit a parse tree produced by the `ParenFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 */
	exitParenFunction?: (ctx: ParenFunctionContext) => void;
	/**
	 * Enter a parse tree produced by `WynntilsParser.argList`.
	 * @param ctx the parse tree
	 */
	enterArgList?: (ctx: ArgListContext) => void;
	/**
	 * Exit a parse tree produced by `WynntilsParser.argList`.
	 * @param ctx the parse tree
	 */
	exitArgList?: (ctx: ArgListContext) => void;
	/**
	 * Enter a parse tree produced by `WynntilsParser.literal`.
	 * @param ctx the parse tree
	 */
	enterLiteral?: (ctx: LiteralContext) => void;
	/**
	 * Exit a parse tree produced by `WynntilsParser.literal`.
	 * @param ctx the parse tree
	 */
	exitLiteral?: (ctx: LiteralContext) => void;
}

