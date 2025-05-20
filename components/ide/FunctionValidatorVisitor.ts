import WynntilsVisitor from "@/lib/antlr/WynntilsVisitor.ts";
import { NoArgsFunctionContext, ParenFunctionContext } from "@/lib/antlr/WynntilsParser.ts";
import { wynntilsfunction } from "@prisma/client";

export const invalidFunctions: { start: number; stop: number }[] = [];
let knownFunctionNames: string[];

export class FunctionValidatorVisitor extends WynntilsVisitor<void> {
    constructor(functions: wynntilsfunction[]) {
        super();
        knownFunctionNames = functions.map((fn) => fn.name);
    }

    visitNoArgsFunction = (ctx: NoArgsFunctionContext): void => {
        const name = ctx.IDENTIFIER().getText();
        if (!knownFunctionNames.includes(name)) {
            invalidFunctions.push({
                start: ctx.IDENTIFIER().symbol.start,
                stop: ctx.IDENTIFIER().symbol.stop,
            });
        }
    };

    visitParenFunction = (ctx: ParenFunctionContext): void => {
        const name = ctx.IDENTIFIER().getText();
        if (!knownFunctionNames.includes(name)) {
            invalidFunctions.push({
                start: ctx.IDENTIFIER().symbol.start,
                stop: ctx.IDENTIFIER().symbol.stop,
            });
        }
    };
}
