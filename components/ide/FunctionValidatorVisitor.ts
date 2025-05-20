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
        visitFunction(ctx);
    };

    visitParenFunction = (ctx: ParenFunctionContext): void => {
        visitFunction(ctx);
    };
}

function visitFunction(ctx: ParenFunctionContext | NoArgsFunctionContext): void {
    const id = ctx.IDENTIFIER();
    const start = id.symbol.start;
    const stop = id.symbol.stop;
    const name = id.getText();

    const isValid = knownFunctionNames.includes(name);
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
