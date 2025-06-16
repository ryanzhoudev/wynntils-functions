import WynntilsVisitor from "@/lib/antlr/WynntilsVisitor.ts";
import { NoArgsFunctionContext, ParenFunctionContext } from "@/lib/antlr/WynntilsParser.ts";
import { wynntilsfunction } from "@prisma/client";

let knownFunctionNames: string[];
const invalidMap = new Map<number, Marker>();

export class FunctionValidatorVisitor extends WynntilsVisitor<void> {
    constructor(functions: wynntilsfunction[]) {
        super();
        knownFunctionNames = functions.map((fn) => fn.name);
    }

    visitNoArgsFunction = (ctx: NoArgsFunctionContext): void => {
        console.log("Visiting no-args function:", ctx.getText());
        visitFunction(ctx);
    };

    visitParenFunction = (ctx: ParenFunctionContext): void => {
        console.log("Visiting paren function:", ctx.getText());
        visitFunction(ctx);
    };
}

function visitFunction(ctx: ParenFunctionContext | NoArgsFunctionContext): void {
    const id = ctx.IDENTIFIER();
    const start = id.symbol.start;
    const stop = id.symbol.stop;
    const name = id.getText();

    console.log(`Validating function: ${name} at ${start}-${stop}`);
    const isValid = knownFunctionNames.includes(name) || name.length === 0;
    const exists = invalidMap.has(start);

    if (!isValid) {
        if (!exists) {
            invalidMap.set(start, { start, stop });
        } else {
            // Update range if length changed
            const existing = invalidMap.get(start)!;
            if (existing.stop !== stop) {
                invalidMap.set(start, { start, stop });
            }
        }
    } else {
        if (exists) {
            invalidMap.delete(start);
        }
    }
}

export function getInvalidFunctions() {
    return Array.from(invalidMap.values());
}

type Marker = {
    start: number;
    stop: number;
};
