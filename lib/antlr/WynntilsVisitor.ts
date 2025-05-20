// Generated from lib/Wynntils.g4 by ANTLR 4.13.2

import {ParseTreeVisitor} from 'antlr4';


import { ScriptContext } from "./WynntilsParser.js";
import { ExpressionContext } from "./WynntilsParser.js";
import { NoArgsFunctionContext } from "./WynntilsParser.js";
import { ParenFunctionContext } from "./WynntilsParser.js";
import { ArgListContext } from "./WynntilsParser.js";
import { LiteralContext } from "./WynntilsParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `WynntilsParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class WynntilsVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `WynntilsParser.script`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitScript?: (ctx: ScriptContext) => Result;
	/**
	 * Visit a parse tree produced by `WynntilsParser.expression`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpression?: (ctx: ExpressionContext) => Result;
	/**
	 * Visit a parse tree produced by the `NoArgsFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNoArgsFunction?: (ctx: NoArgsFunctionContext) => Result;
	/**
	 * Visit a parse tree produced by the `ParenFunction`
	 * labeled alternative in `WynntilsParser.functionCall`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitParenFunction?: (ctx: ParenFunctionContext) => Result;
	/**
	 * Visit a parse tree produced by `WynntilsParser.argList`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArgList?: (ctx: ArgListContext) => Result;
	/**
	 * Visit a parse tree produced by `WynntilsParser.literal`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitLiteral?: (ctx: LiteralContext) => Result;
}

